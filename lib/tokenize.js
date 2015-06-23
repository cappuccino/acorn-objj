"use strict";

var acorn = require("acorn"),
    keywords = require("./token-types").keywords;

// jscs: disable requireMultipleVarDecl

var tt = acorn.tokTypes;

// jscs: enable

acorn.Parser.prototype.objj_readWord = function(next)
{
    next.call(this);

    // tt.name is the fallback type for unknown identifiers.
    // If we have a tt.name, see if it could be an Objective-J keyword.
    if (this.type === tt.name)
    {
        if (this.objj_options.objj)
        {
            var type = keywords[this.value];

            if (type)
                this.type = type;
        }
    }
};

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
    var ch = this.input.charCodeAt(this.pos++),
        token;

    if (ch === 34 || ch === 39) // " or '
    {
        token = this.readString(ch);
    }
    else if (ch === 60) // <
    {
        for (var start = this.pos + 1; ;)
        {
            ch = this.input.charCodeAt(++this.pos);

            if (this.pos >= this.input.length || acorn.isNewLine(ch))
                this.raise(this.start, "Unterminated import statement");

            if (ch === 62) // '>'
            {
                token = this.finishToken(tt.objj_filename, this.input.slice(start, this.pos++));
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
    if (code === 64 && this.objj_options.objj) // @
        return this.objj_readToken_at(code);

    return next.call(this, code);
};
