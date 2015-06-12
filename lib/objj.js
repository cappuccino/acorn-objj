"use strict";

var acorn = require("acorn");

// jscs: disable requireMultipleVarDecl

var tt = acorn.tokTypes,
    objjKeywords = [
        ["@[", "arrayLiteral"],
        ["@{", "dictionaryLiteral"],
        "@selector",
        "@class"
    ];

// jscs: enable

function addKeywords(keywords)
{
    for (var i = 0; i < keywords.length; ++i)
    {
        var keyword = keywords[i],
            label = keyword,
            options = {};

        if (Array.isArray(keyword))
        {
            label = keyword[1];

            if (keyword.length > 2)
                options = keyword[2];

            keyword = keyword[0];
        }

        var id = label.charAt(0) === "@" ? label.substr(1) : label;

        options.keyword = keyword;
        tt["objj_" + id] = new acorn.TokenType(keyword, options);
    }
}

addKeywords(objjKeywords);

acorn.Parser.prototype.objj_expect = function(token, message)
{
    if (!this.eat(token))
        this.raise(this.start, message);
};

acorn.Parser.prototype.objj_readToken_at = function()
{
    var next = this.input.charCodeAt(++this.pos);

    if (next === 34 || next === 39) // Read string if "'" or '"'
        return this.readString(next);

    if (next === 123) // Read dictionary literal if "{"
        return this.finishToken(tt.objj_dictionaryLiteral);

    if (next === 91) // Read array literal if "["
        return this.finishToken(tt.objj_arrayLiteral);

    var word = this.readWord1(),
        token = tt["objj_" + word];

    if (!token)
        this.raise(this.start, "Unrecognized Objective-J keyword '@" + word + "'");

    return this.finishToken(token);
};

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

acorn.Parser.prototype.objj_getTokenFromCode = function(inner, code)
{
    if (code === 64) // @
        return this.objj_readToken_at(code);

    return inner.call(this, code);
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

acorn.Parser.prototype.objj_parseClassStatement = function()
{
    var node = this.startNode();

    this.next();
    node.id = this.parseIdent(false);

    return this.finishNode(node, "objj_ClassStatement");
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
            return this.objj_parseClassStatement();

        default:
            return inner.call(this, refShorthandDefaultPos);
    }
};

module.exports = function(instance)
{
    instance.extend("getTokenFromCode", function(inner)
    {
        return function(code)
        {
            return this.objj_getTokenFromCode(inner, code);
        };
    });

    instance.extend("parseExprAtom", function(inner)
    {
        return function(refShorthandDefaultPos)
        {
            return this.objj_parseExprAtom(inner, refShorthandDefaultPos);
        };
    });
};
