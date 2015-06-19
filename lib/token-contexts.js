"use strict";

var acorn = require("acorn");

require("./token-types");

var tt = acorn.tokTypes,
    types = {
        // Use a context for @import so we can a custom tokenizer for the filename
        objj_import:
            new acorn.TokContext(
                "@import",
                false,
                false,

                // jscs: disable requirePaddingNewLinesAfterBlocks
                function(parser) { return parser.objj_readImportFilenameToken(); }

                // jscs: enable
            )
    };

for (var type in types)
{
    if (types.hasOwnProperty(type))
        acorn.tokContexts[type] = types[types];
}

tt._objj_import.updateContext = function()
{
    this.context.push(types.objj_import);
    this.exprAllowed = false;
};
