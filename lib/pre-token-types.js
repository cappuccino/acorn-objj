"use strict";

var acorn = require("acorn"),
    tokenTypes = require("./token-types.js"),
    utils = require("./utils.js");

// jscs: disable requireMultipleVarDecl

var tt = acorn.tokTypes,
    TokenType = acorn.TokenType,
    preprocessorKeywords = [
        "#define",
        "#undef",
        "#ifdef",
        "#ifndef",
        "#if",
        "#else",
        "#endif",
        "#elif",
        "#pragma",
        "#error",
        "#warning"
    ],

    // Maps preprocessor keyword names to token types
    preprocessorKeywordMap = {};

// jscs: enable

exports.preprocessorKeywordMap = preprocessorKeywordMap;

/*
    Initialize preprocessor keywords and tokens
*/
tokenTypes.addKeywords(preprocessorKeywords, preprocessorKeywordMap);
tokenTypes.kw(preprocessorKeywordMap, "preprocess", { keyword: "#" });

tt.objj_preTokenPaste = new TokenType("##");
tt.objj_stringifiedName = new TokenType("stringified name");
tt.objj_eol = new TokenType("eol");

// A list of tokens that can be used in a preprocessor expression.
var preprocessorExpressionTokens = [
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
        tt.relational,
        tt.bitShift,
        tt.plusMin,
        tt.modulo,
        tt.star,
        tt.slash
    ],
    preprocessorTokenMap = {};

for (var ti = 0; ti < preprocessorExpressionTokens.length; ++ti)
    preprocessorTokenMap[preprocessorExpressionTokens[ti].label] = true;

acorn.Parser.prototype.objj_isPreprocessorToken = function(type)
{
    return !!preprocessorTokenMap[type.label];
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
