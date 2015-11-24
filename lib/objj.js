"use strict";

const
    acorn = require("acorn"),
    tokenTypes = require("./token-types.js"),
    utils = require("./utils.js");

// Plug stuff into acorn
require("./tokenize.js");

const tokenContexts = require("./token-contexts.js");

require("./expressions.js");
require("./statements.js");

const tt = acorn.tokTypes;

// Main init entry point for the plugin. Method overrides are done here.
exports.init = function(parser)
{
    let options = parser.options.plugins.objj,
        pp = acorn.Parser.prototype;

    // If onInsertedSemicolon has been set, bind it to the parser.
    if (parser.options.onInsertedSemicolon)
        parser.options.onInsertedSemicolon = parser.options.onInsertedSemicolon.bind(parser);

    if (options.objj)
    {
        // This needs runtime init because a TokenContext has to be
        // constructed and set on acorn, and it doesn't work correctly
        // at load time.
        tokenContexts.init();
    }

    parser.objj = {
        // objj-specific options
        options,

        // Parser flags
        flags: new Set(),

        issues: options.issues,
        file: options.file,
        messageSend: null,
        keywordMap: new Map()
    };

    delete options.issues;
    delete options.file;

    if (options.objj)
    {
        parser.objj_patchKeywords();

        // An expression that stores the start of a message send
        parser.objj.messageSend = null;

        utils.extendParser(parser, "next", pp.objj_next);
        utils.extendParser(parser, "checkLVal", pp.objj_checkLVal);
        utils.extendParser(parser, "insertSemicolon", pp.objj_insertSemicolon);
        utils.extendParser(parser, "readWord", pp.objj_readWord, true);
        utils.extendParser(parser, "readToken_dot", pp.objj_readToken_dot);
        utils.extendParser(parser, "getTokenFromCode", pp.objj_getTokenFromCode);
        utils.extendParser(parser, "parseStatement", pp.objj_parseStatement);
        utils.extendParser(parser, "parseSubscripts", pp.objj_parseSubscripts, true);
        utils.extendParser(parser, "parseExprAtom", pp.objj_parseExprAtom);
    }

    if (options.betterErrors === true)
    {
        utils.extendParser(parser, "expect", pp.objj_expect, true);
        utils.extendParser(parser, "semicolon", pp.objj_semicolon);
        utils.extendParser(parser, "raise", pp.objj_raise);
    }
};

acorn.Parser.prototype.objj_patchKeywords = function()
{
    this.objj.keywords = utils.makeKeywordRegexp(tokenTypes.objjKeywords);

    // Add objj keywords to acorn's regexp
    const keywords = this.keywords.source.slice(2, -2).replace(/\|/g, " ");

    this.keywords = utils.makeKeywordRegexp(keywords + " " + tokenTypes.objjKeywords);

    for (const name of Object.keys(tt))
    {
        const type = tt[name];

        if (type.keyword !== undefined)
            this.objj.keywordMap.set(type.keyword, type);
    }
};

acorn.Parser.prototype.objj_expect = function(type, context)
{
    if (!this.eat(type))
    {
        let error;

        if (context && context.charAt(0) === "!")
            error = context.substr(1);
        else
            error = `Expected '${type.label}'${context ? " " + context : ""}`;

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
    const
        canInsert = next.call(this),
        messageSend = this.objj.messageSend;

    if (messageSend !== null && canInsert !== true && this.options.onInsertedSemicolon !== null)
    {
        this.options.onInsertedSemicolon(
            messageSend.objj.lastTokEnd,
            messageSend.objj.lastTokEndLoc
        );
    }

    return canInsert === true || messageSend !== null;
};

acorn.Parser.prototype.objj_expectedSemicolon = function(offset)
{
    this.raise(offset, "Expected a semicolon");
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
            throw this.objj.issues.addAcornError(ex, this.input, this.sourceFile || this.objj.file);
        else
            throw ex;
    }
};

acorn.Parser.prototype.objj_setFlag = function(key)
{
    this.objj.flags.add(key);
};

acorn.Parser.prototype.objj_clearFlag = function(key)
{
    this.objj.flags.delete(key);
};

acorn.Parser.prototype.objj_getFlag = function(key)
{
    return this.objj.flags.has(key);
};
