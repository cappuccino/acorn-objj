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
    objjKeywordMap = {};

exports.kw = function(map, label, options)
{
    var ttName = label;

    if (ttName.charCodeAt(0) === 64) // @
        ttName = ttName.substr(1);
    else if (ttName.charCodeAt(0) === 35) // #
    {
        ttName = ttName.substr(1);
        options.keyword = ttName;
        ttName = "pre_" + ttName;
    }

    options.keyword = options.keyword || label;
    map[options.keyword] = tt["_objj_" + ttName] = new TokenType(label, options);
};

exports.addKeywords = function(words, map)
{
    for (var i = 0; i < words.length; ++i)
    {
        var label = words[i],
            options = {};

        if (Array.isArray(label))
        {
            options = label[1];
            label = label[0];

            if (!options.keyword)
            {
                var opts = {};

                for (var key in options)
                {
                    // istanbul ignore else
                    if (options.hasOwnProperty(key))
                        opts[key] = options[key];
                }

                options = opts;
            }
        }

        exports.kw(map, label, options);
    }
};

exports.addKeywords(objjKeywords, objjKeywordMap);
exports.objjKeywords = objjKeywordMap;
