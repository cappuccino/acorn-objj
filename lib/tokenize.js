"use strict";

const
    acorn = require("acorn"),
    flags = require("./flags.js"),
    tokenTypes = require("./token-types.js");

const tt = acorn.tokTypes; // jscs: ignore requireMultipleVarDecl

exports.init = function(parser)
{
    const pp = parser.constructor.prototype;

    if (pp.objj_readToken_at)
        return;

    for (const key of Object.keys(overrides))
        pp[key] = overrides[key];
};

const overrides = {

    objj_readToken_at()
    {
        const next = this.input.charCodeAt(++this.pos);

        if (next === 34 || next === 39) // Read string if "'" or '"'
            return this.readString(next);

        if (next === 123) // Read dictionary literal if "{"
            return this.finishToken(tt.objj_dictionaryLiteral);

        if (next === 91) // Read array literal if "["
            return this.finishToken(tt.objj_arrayLiteral);

        const
            word = this.readWord1(),
            token = tt["_objj_" + word];

        if (token === undefined)
            this.raise(this.start, `Unrecognized Objective-J keyword '@${word}'`);

        return this.finishToken(token);
    },

    objj_readToken_dot(next)
    {
        let token;

        // If an ellipsis is expected, make sure we can parse it.
        if (this.objj_getFlag(flags.kExpectEllipsis))
        {
            const oldVersion = this.options.ecmaVersion;

            this.options.ecmaVersion = 6;
            token = next.call(this);
            this.options.ecmaVersion = oldVersion;
        }
        else
            token = next.call(this);

        return token;
    },

    // Custom tokenizer used in objj_import context
    objj_readImportFilenameToken()
    {
        let ch = this.input.charCodeAt(this.pos),
            token;

        if (ch === 34 || ch === 39) // " or '
            token = this.readString(ch);
        else if (ch === 60) // <
        {
            ++this.pos;

            for (let start = this.pos; ;)
            {
                ch = this.input.charCodeAt(++this.pos);

                if (this.pos >= this.input.length || acorn.isNewLine(ch))
                    this.raise(this.start, "Unterminated import statement");

                if (ch === 62) // '>'
                {
                    const filename = this.input.slice(start, this.pos);

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
    },

    objj_getTokenFromCode(next, code)
    {
        const options = this.objj.options;

        if (code === 64 && options.objj) // @
            return this.objj_readToken_at(code);

        return next.call(this, code);
    },

    objj_readWord()
    {
        const word = this.readWord1();

        let type = tt.name;

        if (this.options.ecmaVersion >= 6 || !this.containsEsc)
        {
            // Special case for "super". If we are parsing a possible message send,
            // then the type is _objj_super. Otherwise if ecmaVersion >= 6, the type
            // is _super. Otherwise it's a plain name.
            if (word === "super")
            {
                if (this.objj_getFlag(flags.kMaybeMessageSend))
                    type = tt._objj_super;
                else if (this.options.ecmaVersion >= 6)
                    type = tt._super;
            }
            else if (this.objj.keywords.test(word))
                type = tokenTypes.objjKeywordMap.get(word);
            else if (this.keywords.test(word))
                type = this.objj.keywordMap.get(word);
        }

        return this.finishToken(type, word);
    },

    objj_next(next)
    {
        this.objj.messageSend = null;
        next.call(this);
    }
};
