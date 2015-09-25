"use strict";

var acorn = require("acorn");

// jscs: disable requireMultipleVarDecl

var tt = acorn.tokTypes;

// jscs: enable

acorn.Parser.prototype.objj_checkLVal = function(next, expr, isBinding, checkClashes)
{
    if (expr.type === "objj_Dereference")
    {
        // istanbul ignore next: unable to trigger this
        if (isBinding)
            this.raise(expr.start, "Binding dereference");
    }
    else
    {
        next.call(this, expr, isBinding, checkClashes);
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
            this.expect(tt.colon, "in selector");
            selectors.push(":");
        }
    }

    if (selectors.length === 0)
        this.raise(this.start, "Empty selector");

    node.objj.selector = selectors.join("");
};

/*
    objj:

    selectors: Array - Identifier nodes
    args: Array - Expression nodes
    varArgs: Array - Expression nodes following a comma
*/
acorn.Parser.prototype.objj_parseSelectorWithArguments = function(node)
{
    var first = true;

    node.objj.selectors = [];
    node.objj.args = [];

    while (true)
    {
        if (this.type === tt.colon)
        {
            node.objj.selectors.push(null);
        }
        else
        {
            node.objj.selectors.push(this.parseIdent(true));

            if (first && this.eat(tt.bracketR))
                break;
        }

        this.expect(tt.colon, "in selector");
        node.objj.args.push(this.parseMaybeAssign(true));

        if (this.eat(tt.bracketR))
            break;

        if (this.type === tt.comma)
        {
            node.objj.varArgs = [];

            while (this.eat(tt.comma))
                node.objj.varArgs.push(this.parseMaybeAssign(true));

            this.eat(tt.bracketR);
            break;
        }

        first = false;
    }
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
            this.expect(tt.comma, "between expressions");

            if (this.eat(tt.braceR))
                break;
        }

        keys.push(this.parseMaybeAssign(true));
        this.expect(tt.colon, "between dictionary key and value");
        values.push(this.parseMaybeAssign(true));
        first = false;
    }

    return [keys, values];
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

    selector: string
*/
acorn.Parser.prototype.objj_parseSelectorLiteral = function()
{
    var node = this.startNode();

    node.objj = {};
    this.next();
    this.expect(tt.parenL, "after '@selector'");
    this.objj_parseSelector(node, tt.parenR);
    this.expect(tt.parenR, "after selector");

    return this.finishNode(node, "objj_SelectorLiteralExpression");
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
    this.expect(tt.parenL, "after '@ref'");

    if (this.type === tt.parenR)
        this.raise(this.start, "Empty reference");

    node.objj = {
        ref: this.parseIdent(node, tt.parenR)
    };

    this.expect(tt.parenR, "after ref");

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
    this.expect(tt.parenL, "after '@deref'");

    if (this.type === tt.parenR)
        this.raise(this.start, "Empty dereference");

    node.objj = {
        ref: this.parseMaybeAssign(true)
    };

    this.expect(tt.parenR, "after ref");

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
        this.type === tt._objj_JSObject ||
        this.type === tt._objj_instancetype)
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

        var isLong = this.type === tt._objj_long;

        if (haveType) // signed/unsigned
            objj.name += " " + this.type.keyword;

        this.next();

        if (isLong && (this.type === tt._objj_long || this.type === tt._objj_int))
        {
            objj.name += " " + this.type.keyword;
            this.next();
        }
    }
};

acorn.Parser.prototype.objj_parseMaybeMessageSend = function(refShorthandDefaultPos)
{
    /*
        Note we had to modify the original code in the parseExprAtom case
        for tt.bracketL, adding code before or after was not sufficient.
    */
    var node = this.startNode(),
        expr = null;

    this.next();

    // istanbul ignore next
    // check whether this is array comprehension or regular array
    if (this.options.ecmaVersion >= 7 && this.type === tt._for)
        return this.parseComprehension(node, false);

    if (this.type !== tt.comma && this.type !== tt.bracketR)
    {
        expr = this.parseMaybeAssign(true, refShorthandDefaultPos);

        if (this.type !== tt.comma && this.type !== tt.bracketR)
            return this.objj_parseMessageSendExpression(node, expr);
    }

    if (expr !== null || this.type !== tt.bracketR)
    {
        node.elements = [expr];

        if (this.eat(tt.comma))
        {
            expr = this.parseExprList(tt.bracketR, true, true, refShorthandDefaultPos);
            node.elements = node.elements.concat(expr);
        }
        else
            this.eat(tt.bracketR);
    }
    else
    {
        node.elements = [];
        this.eat(tt.bracketR);
    }

    return this.finishNode(node, "ArrayExpression");
};

/*
    objj:

    selectors: Array - Identifier nodes
    args: Array - ExpressionStatement nodes
    varArgs: Array - ExpressionStatement nodes following a comma
    receiver: ExpressionStatement | "super"
*/
acorn.Parser.prototype.objj_parseMessageSendExpression = function(node, receiver)
{
    node.objj = {};
    this.objj_parseSelectorWithArguments(node);

    if (receiver.type === "Identifier" && receiver.name === "super")
        node.objj.receiver = "super";
    else
        node.objj.receiver = receiver;

    return this.finishNode(node, "objj_MessageSendExpression");
};

acorn.Parser.prototype.objj_parseSubscripts = function(base, startPos, startLoc, noCalls)
{
    // No way to monkey-patch this method, we had to copy/paste
    // the whole method and modify the tt.bracketL case.

    var node;

    while (true)
    {
        if (this.eat(tt.dot))
        {
            node = this.startNodeAt(startPos, startLoc);
            node.object = base;
            node.property = this.parseIdent(true);
            node.computed = false;
            base = this.finishNode(node, "MemberExpression");
        }
        else if (this.type === tt.bracketL)
        {
            var messageSendNode = this.startNode(),
                lastTokEnd = this.lastTokEnd,
                lastTokEndLoc = this.lastTokEndLoc;

            this.next();

            var expr = this.parseExpression();

            if (this.type !== tt.bracketR)
            {
                messageSendNode.objj = {
                    receiver: expr,
                    lastTokEnd: lastTokEnd,
                    lastTokEndLoc: lastTokEndLoc
                };

                this.objj.messageSend = messageSendNode;

                return base;
            }

            node = this.startNodeAt(startPos, startLoc);
            node.object = base;
            node.property = expr;
            node.computed = true;
            this.expect(tt.bracketR);
            base = this.finishNode(node, "MemberExpression");
        }
        else if (!noCalls && this.eat(tt.parenL))
        {
            node = this.startNodeAt(startPos, startLoc);
            node.callee = base;
            node.arguments = this.parseExprList(tt.parenR, false);
            base = this.finishNode(node, "CallExpression");
        }

        // istanbul ignore next: don't care about testing this
        else if (this.ecmaVersion >= 6 && this.type === tt.backQuote)
        {
            node = this.startNodeAt(startPos, startLoc);
            node.tag = base;
            node.quasi = this.parseTemplate();
            base = this.finishNode(node, "TaggedTemplateExpression");
        }
        else
        {
            return base;
        }
    }
};

acorn.Parser.prototype.objj_parseExprAtom = function(next, refShorthandDefaultPos)
{
    switch (this.type)
    {
        case tt.bracketL:
            return this.objj_parseMaybeMessageSend(refShorthandDefaultPos);

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
            return next.call(this, refShorthandDefaultPos);
    }
};
