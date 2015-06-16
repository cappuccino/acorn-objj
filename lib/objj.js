"use strict";

var acorn = require("acorn");

// These requires plug stuff into acorn
require("./tokentypes");
require("./tokenize");
require("./expressions");

acorn.Parser.prototype.objj_expect = function(token, message)
{
    if (!this.eat(token))
        this.raise(this.start, message);
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

    instance.extend("readToken_lt_gt", function(inner)
    {
        return function(code)
        {
            return this.objj_readToken_lt_gt(inner, code);
        };
    });

    instance.extend("parseExprAtom", function(inner)
    {
        return function(refShorthandDefaultPos)
        {
            return this.objj_parseExprAtom(inner, refShorthandDefaultPos);
        };
    });

    instance.extend("checkLVal", function(inner)
    {
        return function(expr, isBinding, checkClashes)
        {
            return this.objj_checkLVal(inner, expr, isBinding, checkClashes);
        };
    });
};
