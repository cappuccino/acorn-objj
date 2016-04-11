"use strict";

const acorn = require("acorn");

const // jscs: ignore requireMultipleVarDecl
    tt = acorn.tokTypes,
    TokenType = acorn.TokenType;

// Non-keyword tokens
tt.objj_filename = new TokenType("filename");
tt.objj_arrayLiteral = new TokenType("@[", { beforeExpr: true, startsExpr: true });
tt.objj_dictionaryLiteral = new TokenType("@{", { beforeExpr: true, startsExpr: true });

// Keyword tokens
const
    isType = { isType: true },
    keywords = [
        // IB keywords
        "@action",
        "@outlet",
        "IBAction",
        "IBOutlet",

        // type keywords
        ["BOOL", isType],
        ["byte", isType],
        ["char", isType],
        ["double", isType],
        ["float", isType],
        ["id", isType],
        ["int", isType],
        ["instancetype", isType],
        ["JSObject", isType],
        ["long", isType],
        ["SEL", isType],
        ["short", isType],
        ["signed", isType],
        ["unsigned", isType],
        ["CPInteger", isType],
        ["CPTimeInterval", isType],
        ["CPUInteger", isType],

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
        ["@ref", isType], // @ref can also be a type
        "@required",
        "@selector",
        "@typedef"
    ];

// Maps keyword names to token types
let objjKeywordMap = new Map(),
    objjKeywords = [];

exports.kw = function(map, label, options)
{
    let name = label;

    if (name.charCodeAt(0) === 64) // @
        name = name.substr(1);
    else
        objjKeywords.push(name);

    options.keyword = options.keyword || label;

    const type = new TokenType(label, options);

    if (options.isType)
        type.objj_isType = true;

    tt["_objj_" + name] = type;
    map.set(options.keyword, type);
};

exports.addKeywords = function(words, map)
{
    for (let label of words)
    {
        let options = {};

        if (Array.isArray(label))
        {
            options = label[1];
            label = label[0];

            // istanbul ignore else
            if (options.keyword === undefined)
            {
                let opts = {};

                for (let key of Object.keys(options))
                    opts[key] = options[key];

                options = opts;
            }
        }

        exports.kw(map, label, options);
    }
};

exports.addKeywords(keywords, objjKeywordMap);
exports.objjKeywordMap = objjKeywordMap;

// A space-separated list of non-@ keywords as a string
exports.objjKeywords = objjKeywords.join(" ");

// Mark JS keywords that can be objj types
const keywordTypes = [
    tt._void
];

for (const type of keywordTypes)
    type.objj_isType = true;
