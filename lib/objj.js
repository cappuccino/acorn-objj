"use strict";

var acorn = require("acorn"),
    utils = require("./utils.js");

// These requires plug stuff into acorn
require("./token-types.js");
require("./token-contexts.js");
require("./tokenize.js");
require("./expressions.js");
require("./statements.js");

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
        var pre = require("./preprocessor.js");

        pre.init(parser);
    }

    utils.extendParser(parser, "readToken_dot", pp.objj_readToken_dot);
    utils.extendParser(parser, "getTokenFromCode", pp.objj_getTokenFromCode);
    utils.extendParser(parser, "parseExprAtom", pp.objj_parseExprAtom);
    utils.extendParser(parser, "parseStatement", pp.objj_parseStatement);
};
