"use strict";

var acorn = require("acorn"),
    tokenTypes = require("./token-types"),
    utils = require("./utils");

// jscs: disable requireMultipleVarDecl

/*
    Initialize preprocessor keywords and tokens
*/
var preprocessorKeywords = [
        "#define",
        "#undef",
        "#ifdef",
        "#ifndef",
        "#if",
        "#else",
        "#endif",
        "#elif",
        "#pragma",
        ["pre_error", { keyword: "error" }],
        ["pre_warning", { keyword: "warning" }]
    ],

    // Maps preprocessor keyword names to token types
    preprocessorKeywordMap = {},
    tt = acorn.tokTypes,
    TokenType = acorn.TokenType;

// jscs: enable

exports.preprocessorKeywordMap = preprocessorKeywordMap;

tokenTypes.addKeywords(preprocessorKeywords, preprocessorKeywordMap);
tokenTypes.kw(preprocessorKeywordMap, "preprocess", { keyword: "#" });

tt.objj_preTokenPaste = new TokenType("##");
tt.objj_stringifiedName = new TokenType("stringified name");
tt.objj_eol = new TokenType("eol");

// A list of tokens that can be used in a preprocessor expression.
var preprocessorTokens = [
        tt.num,
        tt.string,
        tt.name,
        tt.objj_eol,
        tt._true,
        tt._false,
        tt.parenL,
        tt.parenR,
        tt.slash,
        tt.prefix,
        tt.logicalOR,
        tt.logicalAND,
        tt.bitwiseOR,
        tt.bitwiseXOR,
        tt.bitwiseAND,
        tt.equality,
        tt.bitShift,
        tt.plusMin,
        tt.modulo,
        tt.star,
        tt.slash
    ],
    preprocessorTokenMap = {};

for (var ti = 0; ti < preprocessorTokens.length; ++ti)
    preprocessorTokenMap[preprocessorTokens[ti]] = true;

// jscs: enable

acorn.Parser.prototype.objj_isPreprocessorToken = function(type)
{
    return !!preprocessorTokenMap[type];
};

acorn.Parser.prototype.objj_isPreprocessorKeyword =
    utils.makePredicate([
        "define",
        "undef",
        "pragma",
        "if",
        "ifdef",
        "ifndef",
        "else",
        "elif",
        "endif",
        "error",
        "warning"
    ].join(" "));
