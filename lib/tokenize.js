"use strict";

var acorn = require("acorn"),
    tokenTypes = require("./token-types"),
    utils = require("./utils");

// jscs: disable requireMultipleVarDecl

var tt = acorn.tokTypes;

// jscs: enable

acorn.Parser.prototype.objj_isObjjKeyword =
    utils.makePredicate([
        "BOOL",
        "byte",
        "char",
        "double",
        "float",
        "IBAction",
        "IBOutlet",
        "id",
        "instancetype",
        "int",
        "JSObject",
        "long",
        "short",
        "SEL",
        "signed",
        "unsigned"
    ].join(" "));

acorn.Parser.prototype.objj_readToken_at = function()
{
    var next = this.input.charCodeAt(++this.pos);

    if (next === 34 || next === 39) // Read string if "'" or '"'
        return this.readString(next);

    if (next === 123) // Read dictionary literal if "{"
        return this.finishToken(tt.objj_dictionaryLiteral);

    if (next === 91) // Read array literal if "["
        return this.finishToken(tt.objj_arrayLiteral);

    var word = this.readWord1(),
        token = tt["_objj_" + word];

    if (!token)
        this.raise(this.start, "Unrecognized Objective-J keyword '@" + word + "'");

    return this.finishToken(token);
};

acorn.Parser.prototype.objj_readToken_dot = function(next)
{
    // Force ECMA version to 6 so it will parse ellipsis (...)
    var oldVersion = this.options.ecmaVersion;

    this.options.ecmaVersion = 6;

    var token = next.call(this);

    this.options.ecmaVersion = oldVersion;

    return token;
};

// Custom tokenizer used in objj_import context
acorn.Parser.prototype.objj_readImportFilenameToken = function()
{
    var ch = this.input.charCodeAt(this.pos),
        token;

    if (ch === 34 || ch === 39) // " or '
    {
        token = this.readString(ch);
    }
    else if (ch === 60) // <
    {
        ++this.pos;

        for (var start = this.pos; ;)
        {
            ch = this.input.charCodeAt(++this.pos);

            if (this.pos >= this.input.length || acorn.isNewLine(ch))
                this.raise(this.start, "Unterminated import statement");

            if (ch === 62) // '>'
            {
                var filename = this.input.slice(start, this.pos);

                // Advance past '>'
                ++this.pos;
                token = this.finishToken(tt.objj_filename, filename);
                break;
            }
        }
    }
    else
        this.raise(this.start, "Expected \" or < after @import");

    this.context.pop();

    return token;
};

acorn.Parser.prototype.objj_getTokenFromCode = function(next, code)
{
    var options = this.objj.options;

    if (code === 64 && options.objj) // @
        return this.objj_readToken_at(code);

    if (options.preprocessor)
    {
        var token = this.objj_getPreprocessorTokenFromCode(code);

        if (token)
            return this.finishToken(token.type, token.value);
    }

    return next.call(this, code);
};

acorn.Parser.prototype.objj_readWord = function(next)
{
    next.call(this);

    if (!this.containsEsc && this.type === tt.name && this.objj_isObjjKeyword(this.value))
        this.type = tokenTypes.objjKeywords[this.value];
};

acorn.Parser.prototype.objj_next = function(next)
{
    this.objj.messageSend = null;
    next.call(this);
};
