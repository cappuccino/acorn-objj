"use strict";

var acorn = require("acorn");

// jscs: disable requireMultipleVarDecl

var TokenType = acorn.TokenType,
    tt = acorn.tokTypes,
    ivarType = { ivarType: true },
    objjTokens = [

        // Internal syntactic tokens
        "filename",

        // ivar/parameter type tokens
        ["BOOL", ivarType],
        ["byte", ivarType],
        ["char", ivarType],
        ["double", ivarType],
        ["float", ivarType],
        ["id", ivarType],
        ["int", ivarType],
        ["JSObject", "object", ivarType],
        ["long", ivarType],
        ["SEL", ivarType],
        ["short", ivarType],
        ["signed", ivarType],
        ["unsigned", ivarType],

        // Syntactic sugar tokens
        ["@[", "arrayLiteral", { beforeExpr: true, startsExpr: true }],
        ["@{", "dictionaryLiteral", { beforeExpr: true, startsExpr: true }],

        // Objective-J keywords
        "@class",
        "@deref",
        "@global",
        "@import",
        "@ref",
        "@selector",
        "@typedef"
    ];

// jscs: enable

function addTokens(tokens)
{
    for (var i = 0; i < tokens.length; ++i)
    {
        var keyword = tokens[i],
            label = keyword,
            options = {};

        if (Array.isArray(keyword))
        {
            if (typeof keyword[1] === "object")
            {
                options = keyword[1];
                label = keyword[0];
            }
            else
            {
                label = keyword[1];

                if (keyword.length > 2)
                    options = keyword[2];
            }

            keyword = keyword[0];
        }

        options.keyword = keyword;
        label = "objj_" + (label.charAt(0) === "@" ? label.substr(1) : label);
        tt[label] = new TokenType(label, options);
    }
}

addTokens(objjTokens);
