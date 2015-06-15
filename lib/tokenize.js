"use strict";

var acorn = require("acorn");

// jscs: disable requireMultipleVarDecl

var tt = acorn.tokTypes;

// jscs: enable

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
        token = tt["objj_" + word];

    if (!token)
        this.raise(this.start, "Unrecognized Objective-J keyword '@" + word + "'");

    return this.finishToken(token);
};

acorn.Parser.prototype.objj_readToken_lt_gt = function(inner, code)
{
    if (code === 60 && // '<'
        this.type === tt.objj_import &&
        this.options.plugins.objj.objj)
    {
        for (var start = this.pos + 1; ;)
        {
            var ch = this.input.charCodeAt(++this.pos);

            if (ch === 62) // '>'
                return this.finishToken(tt.objj_filename, this.input.slice(start, this.pos++));

            if (this.pos >= this.input.length || acorn.isNewLine(ch))
                this.raise(this.start, "Unterminated import statement");
        }
    }

    return inner.call(this, code);
};

acorn.Parser.prototype.objj_getTokenFromCode = function(inner, code)
{
    if (code === 64) // @
        return this.objj_readToken_at(code);

    return inner.call(this, code);
};
