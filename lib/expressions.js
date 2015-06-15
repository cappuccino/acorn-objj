"use strict";

var acorn = require("acorn");

require("./tokentypes");

var tt = acorn.tokTypes;

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

    node.selector = selectors.join("");
};

// Parse a comma-separated list of <key>:<value> pairs and return them as
// [arrayOfKeyExpressions, arrayOfValueExpressions].
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

        // We use parseMaybeAssign because parseExpression will see the comma
        // between items as a sequence expression.
        keys.push(this.parseMaybeAssign(true));
        this.objj_expect(tt.colon, "Expected ':' between dictionary key and value");
        values.push(this.parseMaybeAssign(true));
        first = false;
    }

    return [keys, values];
};

acorn.Parser.prototype.objj_parseSelectorLiteral = function()
{
    var node = this.startNode();

    this.next();
    this.objj_expect(tt.parenL, "Expected '(' after '@selector'");
    this.objj_parseSelector(node, tt.parenR);
    this.objj_expect(tt.parenR, "Expected closing ')' after selector");

    return this.finishNode(node, "objj_SelectorLiteralExpression");
};

acorn.Parser.prototype.objj_parseDictionaryLiteral = function()
{
    var node = this.startNode();

    this.next();

    var dict = this.objj_parseDictionary();

    node.keys = dict[0];
    node.values = dict[1];

    return this.finishNode(node, "objj_DictionaryLiteral");
};

acorn.Parser.prototype.objj_parseArrayLiteral = function(refShorthandDefaultPos)
{
    var node = this.startNode();

    this.next();
    this.eat(tt.bracketL);
    node.elements = this.parseExprList(tt.bracketR, true, true, refShorthandDefaultPos);

    return this.finishNode(node, "objj_ArrayLiteral");
};

acorn.Parser.prototype.objj_parseTypeDeclaration = function(type)
{
    var node = this.startNode();

    this.next();
    node.id = this.parseIdent(false);

    return this.finishNode(node, type);
};

acorn.Parser.prototype.objj_parseImportStatement = function()
{
    var node = this.startNode();

    this.next();

    if (this.type === tt.string)
        node.isLocal = true;
    else if (this.type === tt.objj_filename)
        node.isLocal = false;
    else
        this.unexpected();

    node.filename = this.parseLiteral(this.input.slice(this.start + 1, this.end - 1));

    return this.finishNode(node, "objj_ImportStatement");
};

acorn.Parser.prototype.objj_parseExprAtom = function(inner, refShorthandDefaultPos)
{
    switch (this.type)
    {
        case tt.objj_selector:
            return this.objj_parseSelectorLiteral();

        case tt.objj_dictionaryLiteral:
            return this.objj_parseDictionaryLiteral();

        case tt.objj_arrayLiteral:
            return this.objj_parseArrayLiteral(refShorthandDefaultPos);

        case tt.objj_class:
            return this.objj_parseTypeDeclaration("objj_ClassStatement");

        case tt.objj_global:
            return this.objj_parseTypeDeclaration("objj_GlobalStatement");

        case tt.objj_typedef:
            return this.objj_parseTypeDeclaration("objj_TypeDefStatement");

        case tt.objj_import:
            return this.objj_parseImportStatement();

        default:
            return inner.call(this, refShorthandDefaultPos);
    }
};