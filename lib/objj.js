"use strict";

var acorn = require("acorn");

// These requires plug stuff into acorn
require("./token-types");
require("./token-contexts");
require("./tokenize");
require("./expressions");
require("./statements");

var tt = acorn.tokTypes;

exports.parser = null;

acorn.Parser.prototype.objj_expect = function(token, message)
{
    if (!this.eat(token))
        this.raise(this.start, message);
};

acorn.Parser.prototype.objj_semicolon = function()
{
    // istanbul ignore next: defensive, doesn't happen in practice because we use onInsertedSemicolon
    if (!this.eat(tt.semi) && !this.insertSemicolon())
        this.raise(this.start, "Expected a semicolon");
};

acorn.Parser.prototype.objj_insertSemicolon = function(next)
{
    // If a message send was parsed after a superscript,
    // we have to insert a semicolon.
    var canInsert = next.call(this),
        messageSend = this.objj.messageSend;

    if (messageSend && !canInsert && this.options.onInsertedSemicolon)
    {
        this.options.onInsertedSemicolon(
            messageSend.objj.lastTokEnd,
            messageSend.objj.lastTokEndLoc
        );
    }

    return canInsert || !!messageSend;
};

acorn.Parser.prototype.objj_setState = function(key, value)
{
    this.objj.state[key] = value;
};

acorn.Parser.prototype.objj_getState = function(key)
{
    return this.objj.state[key];
};

// Main init entry point for the plugin. Method overrides are done here.
exports.init = function(parser)
{
    exports.parser = parser;

    var options = parser.options.plugins.objj;

    parser.objj = {
        // An expression that stores the start of a message send
        messageSend: null,

        // objj-specific options
        options: options,

        // Parser state
        state: {}
    };

    if (options.objj)
    {
        parser.extend("checkLVal", function(next)
        {
            return function(expr, isBinding, checkClashes)
            {
                return this.objj_checkLVal(next, expr, isBinding, checkClashes);
            };
        });

        parser.extend("next", function(next)
        {
            return function()
            {
                this.objj.messageSend = null;
                next.call(this);
            };
        });

        parser.extend("insertSemicolon", function(next)
        {
            return function()
            {
                return this.objj_insertSemicolon(next);
            };
        });

        parser.extend("parseSubscripts", function()
        {
            return function(base, startPos, startLoc, noCalls)
            {
                return this.objj_parseSubscripts(base, startPos, startLoc, noCalls);
            };
        });
    }

    parser.extend("readWord", function(next)
    {
        return function()
        {
            return this.objj_readWord(next);
        };
    });

    parser.extend("readToken_dot", function(next)
    {
        return function()
        {
            return this.objj_readToken_dot(next);
        };
    });

    parser.extend("getTokenFromCode", function(next)
    {
        return function(code)
        {
            return this.objj_getTokenFromCode(next, code);
        };
    });

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
