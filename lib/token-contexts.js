"use strict";

var acorn = require("acorn");

// jscs: disable requireMultipleVarDecl

var tt = acorn.tokTypes;

// jscs: enable

exports.init = function()
{
    var contexts = {
            // Use a context for @import so we can a custom tokenizer for the filename
            objj_import:
                new acorn.TokContext(
                    "@import",
                    false,
                    false,

                    // jscs: disable requirePaddingNewLinesAfterBlocks
                    function(parser) {
                        return parser.objj_readImportFilenameToken();
                    }

                    // jscs: enable
                )
        };

    for (var key in contexts)
    {
        // istanbul ignore else
        if (contexts.hasOwnProperty(key))
            acorn.tokContexts[key] = contexts[key];
    }
};

tt._objj_import.updateContext = function()
{
    this.context.push(acorn.tokContexts.objj_import);
    this.exprAllowed = false;
};
