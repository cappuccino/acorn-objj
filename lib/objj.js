"use strict";

var acorn = require("acorn");

// These requires plug stuff into acorn
require("./token-types");
require("./token-contexts");
require("./tokenize");
require("./expressions");
require("./statements");

acorn.Parser.prototype.objj_expect = function(token, message)
{
    if (!this.eat(token))
        this.raise(this.start, message);
};

acorn.Parser.prototype.objj_setState = function(key, value)
{
    this.objj_options.state[key] = value;
};

acorn.Parser.prototype.objj_getState = function(key)
{
    return this.objj_options.state[key];
};

module.exports = function(parser)
{
    var options = parser.options.plugins.objj;

    options.state = {};
    parser.objj_options = options;

    parser.extend("readWord", function(next)
    {
        return function()
        {
            return this.objj_readWord(next);
        };
    });

    parser.extend("getTokenFromCode", function(next)
    {
        return function(code)
        {
            return this.objj_getTokenFromCode(next, code);
        };
    });

    if (options.objj)
    {
        parser.extend("checkLVal", function(next)
        {
            return function(expr, isBinding, checkClashes)
            {
                return this.objj_checkLVal(next, expr, isBinding, checkClashes);
            };
        });
    }

    parser.extend("parseExprAtom", function(next)
    {
        return function(refShorthandDefaultPos)
        {
            return this.objj_parseExprAtom(next, refShorthandDefaultPos);
        };
    });

    parser.extend("parseStatement", function(next)
    {
        return function(declaration, topLevel, terminators)
        {
            return this.objj_parseStatement(next, declaration, topLevel, terminators);
        };
    });
};
