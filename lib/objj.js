"use strict";

const
    acorn = require("acorn"),
    tokenTypes = require("./token-types.js"),
    utils = require("./utils.js");

const tt = acorn.tokTypes; // jscs: ignore requireMultipleVarDecl

// Main init entry point for the plugin. Method overrides are done here.
exports.init = function(parser)
{
    const
        options = parser.options.plugins.objj,
        pp = parser.constructor.prototype;

    // If onInsertedSemicolon has been set, bind it to the parser.
    if (parser.options.onInsertedSemicolon)
        parser.options.onInsertedSemicolon = parser.options.onInsertedSemicolon.bind(parser);

    if (options.objj)
    {
        // Plug stuff into acorn.
        // This needs runtime init because the acorn.Parser instance can't be known
        // by packages using this package until runtime.
        require("./token-contexts.js").init();
        require("./tokenize.js").init(parser);
        require("./expressions.js").init(parser);
        require("./lval.js").init(parser);
        require("./statements.js").init(parser);
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
        patchObjjMethods(parser);
        parser.objj_patchKeywords();

        // An expression that stores the start of a message send
        parser.objj.messageSend = null;

        utils.extendParser(parser, "next", pp.objj_next);
        utils.extendParser(parser, "checkLVal", pp.objj_checkLVal);
        utils.extendParser(parser, "toAssignable", pp.objj_toAssignable);
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
        patchBetterErrorsMethods(parser);
        utils.extendParser(parser, "expect", pp.objj_expect, true);
        utils.extendParser(parser, "semicolon", pp.objj_semicolon);
        utils.extendParser(parser, "raise", pp.objj_raise);
        utils.extendParser(parser, "raiseRecoverable", pp.objj_raise);
    }
};

function patchObjjMethods(parser)
{
    const pp = parser.constructor.prototype;

    if (pp.objj_patchKeywords)
        return;

    for (const key of Object.keys(objjMethods))
        pp[key] = objjMethods[key];
}

const objjMethods = {

    objj_patchKeywords()
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
    },

    objj_insertSemicolon(next)
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
    },

    objj_setFlag(key)
    {
        this.objj.flags.add(key);
    },

    objj_clearFlag(key)
    {
        this.objj.flags.delete(key);
    },

    objj_getFlag(key)
    {
        return this.objj.flags.has(key);
    }
};

function patchBetterErrorsMethods(parser)
{
    const pp = parser.constructor.prototype;

    if (pp.objj_expect)
        return;

    for (const key of Object.keys(betterErrorsMethods))
        pp[key] = betterErrorsMethods[key];
}

const betterErrorsMethods = {

    objj_expect(type, context)
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
    },

    objj_semicolon()
    {
        if (!this.eat(tt.semi) && !this.insertSemicolon())
            this.raise(this.start, "Expected ';' after expression");
    },

    objj_raise(next, pos, message)
    {
        // Convert acorn SyntaxError to issue handler Error
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
    }
};
