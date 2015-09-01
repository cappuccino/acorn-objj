"use strict";

var acorn = require("acorn"),
    issueHandler = require("acorn-issue-handler"),
    utils = require("./utils.js");

// Plug stuff into acorn
require("./token-types.js");

var tokenContexts = require("./token-contexts.js"),
    tokenize = require("./tokenize.js");

require("./expressions.js");
require("./statements.js");

// jscs: disable requireMultipleVarDecl

var tt = acorn.tokTypes;

// jscs: enable

// Main init entry point for the plugin. Method overrides are done here.
exports.init = function(parser)
{
    // This needs runtime init because a TokenContext has to be
    // constructed and set on acorn, and it doesn't work correctly
    // at load time.
    tokenContexts.init();

    // This needs runtime init because readWord is overridden by
    // tokenize.js and pre-tokenize.js.
    tokenize.init();

    exports.parser = parser;

    var options = parser.options.plugins.objj,
        pp = acorn.Parser.prototype;

    parser.objj = {
        // objj-specific options
        options: options,

        // Parser state
        state: {},

        issues: options.issues,
        file: options.file,
        macroList: options.macroList
    };

    delete options.issues;
    delete options.file;
    delete options.macroList;

    if (options.objj)
    {
        // An expression that stores the start of a message send
        parser.objj.messageSend = null;

        utils.extendParser(parser, "next", pp.objj_next);
        utils.extendParser(parser, "checkLVal", pp.objj_checkLVal);
        utils.extendParser(parser, "insertSemicolon", pp.objj_insertSemicolon);
        utils.extendParser(parser, "parseSubscripts", pp.objj_parseSubscripts, true);
        utils.extendParser(parser, "readWord", pp.objj_readWord);
    }

    // Setup when preprocessor is on, but not necessarily objj.
    // We have to do this after objj because the preprocessor
    // overrides some of the same methods.
    if (options.preprocessor)
    {
        // Define acorn method overrides
        require("./preprocessor.js").init(parser);
    }

    utils.extendParser(parser, "expect", pp.objj_expect, true);
    utils.extendParser(parser, "semicolon", pp.objj_semicolon);
    utils.extendParser(parser, "readToken_dot", pp.objj_readToken_dot);
    utils.extendParser(parser, "getTokenFromCode", pp.objj_getTokenFromCode);
    utils.extendParser(parser, "parseExprAtom", pp.objj_parseExprAtom);
    utils.extendParser(parser, "parseStatement", pp.objj_parseStatement);
    utils.extendParser(parser, "raise", pp.objj_raise);
};

acorn.Parser.prototype.objj_expect = function(type, context)
{
    if (!this.eat(type))
    {
        var error;

        if (context && context.charAt(0) === "!")
            error = context.substr(1);
        else
        {
            error = "Expected '" + type.label + "'";
            error += context ? " " + context : "";
        }

        this.raise(this.start, error);
    }
};

acorn.Parser.prototype.objj_semicolon = function()
{
    if (!this.eat(tt.semi) && !this.insertSemicolon())
        this.raise(this.start, "Expected ';' after expression");
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

acorn.Parser.prototype.objj_raise = function(next, pos, message)
{
    try
    {
        next.call(this, pos, message);
    }
    catch (ex)
    {
        // istanbul ignore else: would only happen if an internal error occurred
        if (ex instanceof SyntaxError)
        {
            if (this.objj.preprocessor)
                this.objj.preprocessor.captureTokenExpansion(ex);
            else
                throw issueHandler.addAcornError(this.objj.issues, ex, this.input, this.sourceFile || this.objj.file);
        }
        else
            throw ex;
    }
};

acorn.Parser.prototype.objj_setState = function(key, value)
{
    this.objj.state[key] = value;
};

acorn.Parser.prototype.objj_getState = function(key)
{
    return this.objj.state[key];
};
