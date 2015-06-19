"use strict";

var acorn = require("acorn");

require("./token-types");

var tt = acorn.tokTypes;

acorn.Parser.prototype.objj_checkLVal = function(inner, expr, isBinding, checkClashes)
{
    if (expr.type === "objj_Dereference")
    {
        if (isBinding)
            this.raise(expr.start, "Binding dereference");
    }
    else
    {
        inner.call(this, expr, isBinding, checkClashes);
    }
};

/*
    objj:

    selector: string
*/
acorn.Parser.prototype.objj_parseSelector = function(node, close)
{
    var selectors = [];

    while (this.type !== close)
    {
        if (this.type === tt.colon)
            this.raise(this.start, "Missing selector component");

        selectors.push(this.parseIdent(true).name);

        if (this.type !== close)
        {
            this.objj_expect(tt.colon, "Expected ':' in selector");
            selectors.push(":");
        }
    }

    if (selectors.length === 0)
        this.raise(this.start, "Empty selector");

    node.objj.selector = selectors.join("");
};

/*
    Parse a comma-separated list of <key>:<value> pairs and return them as
    [arrayOfKeyExpressions, arrayOfValueExpressions].
*/
acorn.Parser.prototype.objj_parseDictionary = function()
{
    this.eat(tt.braceL);

    var keys = [],
        values = [],
        first = true;

    while (!this.eat(tt.braceR))
    {
        if (!first)
        {
            this.objj_expect(tt.comma, "Expected ',' between expressions");

            if (this.eat(tt.braceR))
                break;
        }

        keys.push(this.parseMaybeAssign(true));
        this.objj_expect(tt.colon, "Expected ':' between dictionary key and value");
        values.push(this.parseMaybeAssign(true));
        first = false;
    }

    return [keys, values];
};

/*
    objj:

    selector: string
*/
acorn.Parser.prototype.objj_parseSelectorLiteral = function()
{
    var node = this.startNode();

    node.objj = {};
    this.next();
    this.objj_expect(tt.parenL, "Expected '(' after '@selector'");
    this.objj_parseSelector(node, tt.parenR);
    this.objj_expect(tt.parenR, "Expected closing ')' after selector");

    return this.finishNode(node, "objj_SelectorLiteralExpression");
};

/*
    objj:

    keys: Array - Expression nodes
    values: Array - Expression nodes
*/
acorn.Parser.prototype.objj_parseDictionaryLiteral = function()
{
    var node = this.startNode(),
        objj = {};

    node.objj = objj;
    this.next();

    var dict = this.objj_parseDictionary();

    objj.keys = dict[0];
    objj.values = dict[1];

    return this.finishNode(node, "objj_DictionaryLiteral");
};

/*
    objj:

    elements: Array - Expression nodes
*/
acorn.Parser.prototype.objj_parseArrayLiteral = function(refShorthandDefaultPos)
{
    var node = this.startNode();

    this.next();
    this.eat(tt.bracketL);
    node.objj = {
        elements: this.parseExprList(tt.bracketR, true, true, refShorthandDefaultPos)
    };

    return this.finishNode(node, "objj_ArrayLiteral");
};

/*
    objj:

    ref: Identifier node - The referenced identifier
*/
acorn.Parser.prototype.objj_parseRef = function()
{
    var node = this.startNode();

    this.next();
    this.objj_expect(tt.parenL, "Expected '(' after '@ref'");

    if (this.type === tt.parenR)
        this.raise(this.start, "Empty reference");

    node.objj = {
        ref: this.parseIdent(node, tt.parenR)
    };

    this.objj_expect(tt.parenR, "Expected closing ')' after ref");

    return this.finishNode(node, "objj_Reference");
};

/*
    objj:

    ref: Expression node - The reference to deref
*/
acorn.Parser.prototype.objj_parseDeref = function()
{
    var node = this.startNode();

    this.next();
    this.objj_expect(tt.parenL, "Expected '(' after '@deref'");

    if (this.type === tt.parenR)
        this.raise(this.start, "Empty dereference");

    node.objj = {
        ref: this.parseMaybeAssign(true)
    };

    this.objj_expect(tt.parenR, "Expected closing ')' after ref");

    return this.finishNode(node, "objj_Dereference");
};

/*
    Parse the next token as an Objective-J type. It can be:

    - 'id' followed by a optional protocol list '<CPKeyValueBinding, ...>'
    - 'void', 'id', 'SEL' or 'JSObject'
    - 'char', 'byte', 'short', 'int' or 'long', optionally preceded by 'signed' or 'unsigned'
    - 'float' or 'double'

    'int' and 'long' may be preceded by 'long'.

    objj:

    name: string - The type's name
    isClass: boolean - Whether the type is a class or a POD
    protocols: Array - Array of protocols an 'id' type conforms to
*/
acorn.Parser.prototype.objj_parseObjectiveJType = function(startNode)
{
    var node = startNode ? this.startNodeAt(startNode.start) : this.startNode(),
        objj = {};

    node.objj = objj;

    if (this.type === tt.name)
    {
        // It should be a class name
        objj.name = this.value;
        objj.isClass = true;
        this.next();
    }
    else
    {
        objj.isClass = false;
        objj.name = this.type.keyword;

        // Do nothing more if it is 'void'
        if (!this.eat(tt._void))
        {
            if (this.eat(tt._objj_id))
            {
                // If it is 'id' followed by '<', parse protocols. Do nothing more if it is only 'id'.
                if (this.value === "<")
                    this.objj_parseIdProtocolList(objj);
            }
            else
                this.objj_parsePODType(objj);
        }
    }

    return this.finishNode(node, "objj_ObjectiveJType");
};

acorn.Parser.prototype.objj_parseIdProtocolList = function(objj)
{
    var first = true,
        protocols = [];

    objj.protocols = protocols;

    do
    {
        if (first)
        {
            this.next();

            if (this.value === ">")
                this.raise(this.start, "Empty protocol list");

            first = false;
        }
        else
        {
            if (this.type !== tt.comma)
                this.raise(this.start, "Expected a comma between protocols");

            this.next();
        }

        protocols.push(this.parseIdent(true));
    }
    while (this.value !== ">");

    this.next();
};

acorn.Parser.prototype.objj_parsePODType = function(objj)
{
    // Now check if it is some basic type or a valid combination of basic types
    var haveType = false;

    if (this.type === tt._objj_float ||
        this.type === tt._objj_double ||
        this.type === tt._objj_BOOL ||
        this.type === tt._objj_SEL ||
        this.type === tt._objj_JSObject)
    {
        this.next();
    }
    else
    {
        if (this.type === tt._objj_signed || this.type === tt._objj_unsigned)
        {
            haveType = true;
            this.next();
        }

        if (this.type === tt._objj_char ||
            this.type === tt._objj_byte ||
            this.type === tt._objj_short ||
            this.type === tt._objj_int ||
            this.type === tt._objj_long)
        {
            var isLong = this.type === tt._objj_long;

            if (haveType) // signed/unsigned
                objj.name += " " + this.type.keyword;
            else
                haveType = true;

            this.next();

            if (isLong && (this.type === tt._objj_long || this.type === tt._objj_int))
            {
                objj.name += " " + this.type.keyword;
                this.next();
            }
        }

        if (!haveType)
        {
            // It must be a class name if it was not a POD // FIXME: This is not true
            objj.name = (this.options.allowReserved && this.type.keyword) || this.unexpected();
            objj.isClass = true;
            this.next();
        }
    }
};

acorn.Parser.prototype.objj_parseExprAtom = function(inner, refShorthandDefaultPos)
{
    switch (this.type)
    {
        case tt._objj_class:
            return this.objj_parseTypeDeclaration("Class");

        case tt._objj_deref:
            return this.objj_parseDeref();

        case tt._objj_global:
            return this.objj_parseTypeDeclaration("Global");

        case tt._objj_ref:
            return this.objj_parseRef();

        case tt._objj_selector:
            return this.objj_parseSelectorLiteral();

        case tt._objj_typedef:
            return this.objj_parseTypeDeclaration("TypeDef");

        case tt.objj_arrayLiteral:
            return this.objj_parseArrayLiteral(refShorthandDefaultPos);

        case tt.objj_dictionaryLiteral:
            return this.objj_parseDictionaryLiteral();

        default:
            return inner.call(this, refShorthandDefaultPos);
    }
};
