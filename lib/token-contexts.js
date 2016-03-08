"use strict";

const acorn = require("acorn");

const tt = acorn.tokTypes; // jscs: ignore requireMultipleVarDecl

exports.init = function()
{
    const contexts = {
        // Use a context for @import so we can a custom tokenizer for the filename
        objj_import:
            new acorn.TokContext(
                "@import",
                false,
                false,
                parser => parser.objj_readImportFilenameToken()
            )
    };

    for (let key of Object.keys(contexts))
        acorn.tokContexts[key] = contexts[key];
};

tt._objj_import.updateContext = function()
{
    this.context.push(acorn.tokContexts.objj_import);
    this.exprAllowed = false;
};
