"use strict";

var acorn = require("acorn");

// jscs: disable requireMultipleVarDecl

var tt = acorn.tokTypes,
    TokenType = acorn.TokenType;

// jscs: enable

// Non-keyword tokens
tt.objj_filename = new TokenType("filename");
tt.objj_arrayLiteral = new TokenType("@[", { beforeExpr: true, startsExpr: true });
tt.objj_dictionaryLiteral = new TokenType("@{", { beforeExpr: true, startsExpr: true });

// Keyword tokens
var ivarType = { ivarType: true },
    objjKeywords = [

        // IB keywords
        "@action",
        "@outlet",
        "IBAction",
        "IBOutlet",

        // ivar/parameter type keywords
        ["BOOL", ivarType],
        ["byte", ivarType],
        ["char", ivarType],
        ["double", ivarType],
        ["float", ivarType],
        ["id", ivarType],
        ["int", ivarType],
        ["instancetype", ivarType],
        ["JSObject", ivarType],
        ["long", ivarType],
        ["SEL", ivarType],
        ["short", ivarType],
        ["signed", ivarType],
        ["unsigned", ivarType],

        // Objective-J keywords
        "@accessors",
        "@class",
        "@deref",
        "@end",
        "@global",
        "@implementation",
        "@import",
        "@optional",
        "@protocol",
        "@ref",
        "@required",
        "@selector",
        "@typedef"
    ],

    // Maps keyword names to token types
    keywords = {};

function addKeywords(words)
{
    for (var i = 0; i < words.length; ++i)
    {
        var name = words[i],
            options = {};

        if (Array.isArray(name))
        {
            options = name[1];
            name = name[0];
        }

        var ttName = name;

        if (ttName.charCodeAt(0) === 64) // @
            ttName = ttName.substr(1);

        options.keyword = name;
        keywords[name] = tt["_objj_" + ttName] = new TokenType(name, options);
    }
}

addKeywords(objjKeywords);

exports.keywords = keywords;
