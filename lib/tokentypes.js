"use strict";

var acorn = require("acorn");

// jscs: disable requireMultipleVarDecl

var TokenType = acorn.TokenType,
    tt = acorn.tokTypes;

tt.objj_filename = new TokenType("filename");
tt.objj_arrayLiteral = new TokenType("@[", { beforeExpr: true, startsExpr: true });
tt.objj_dictionaryLiteral = new TokenType("@{", { beforeExpr: true, startsExpr: true });

var objjKeywords = [
        "@selector",
        "@class",
        "@global",
        "@typedef",
        "@import"
    ];

function addKeywords(keywords)
{
    for (var i = 0; i < keywords.length; ++i)
    {
        var keyword = keywords[i],
            label = keyword,
            options = {};

        if (Array.isArray(keyword))
        {
            label = keyword[1];

            if (keyword.length > 2)
                options = keyword[2];

            keyword = keyword[0];
        }

        var id = label.charAt(0) === "@" ? label.substr(1) : label;

        options.keyword = keyword;
        tt["objj_" + id] = new TokenType(keyword, options);
    }
}

addKeywords(objjKeywords);
