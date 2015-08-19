"use strict";

var acorn = require("acorn"),
    Preprocessor = require("./preprocessor.js"),
    preprocessorKeywordMap = require("./pre-token-types.js").preprocessorKeywordMap,
    tokenTypes = require("./token-types.js");

exports.PreprocessorToken = function(preprocessor, parser)
{
    parser = parser || preprocessor.parser;

    this.input = parser.input;

    // Token state
    this.type = parser.type;
    this.value = parser.value;

    this.start = parser.start;
    this.end = parser.end;
    this.pos = parser.pos;

    this.lastTokStart = parser.lastTokStart;
    this.lastTokEnd = parser.lastTokEnd;

    if (parser.options.locations)
    {
        this.curLine = parser.curLine;
        this.lineStart = parser.lineStart;
        this.startLoc = new acorn.Position(parser.startLoc.line, parser.startLoc.column);
        this.endLoc = new acorn.Position(parser.endLoc.line, parser.endLoc.column);

        if (parser.lastTokStartLoc)
            this.lastTokStartLoc = new acorn.Position(parser.lastTokStartLoc.line, parser.lastTokStartLoc.column);
        else
            this.lastTokStartLoc = null;

        if (parser.lastTokEndLoc)
            this.lastTokEndLoc = new acorn.Position(parser.lastTokEndLoc.line, parser.lastTokEndLoc.column);
        else
            this.lastTokEndLoc = null;
    }

    this.context = parser.context.slice();
    this.exprAllowed = parser.exprAllowed;
    this.strict = parser.strict;
    this.inModule = parser.inModule;
    this.potentialArrowAt = parser.potentialArrowAt;
    this.inFunction = parser.inFunction;
    this.inGenerator = parser.inGenerator;
    this.labels = parser.labels.slice();

    this.firstTokenOnLine = preprocessor.firstTokenOnLine;
};

var tt = acorn.tokTypes,
    nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;

acorn.Parser.prototype.objj_skipSpace = function()
{
    this.objj.preprocessor.skipSpace.apply(this, arguments);
};

// NOTE: We have to completely override the original to handle EOL and '\'
acorn.Parser.prototype.objj_sourceSkipSpace = function()
{
    var pp = this.objj.preprocessor;

    pp.firstTokenOnLine = this.pos === 0;

    while (this.pos < this.input.length)
    {
        var ch = this.input.charCodeAt(this.pos);

        // noinspection FallThroughInSwitchStatementJS
        switch (ch)
        {
            case 32:
            case 160: // ' '
                ++this.pos;
                break;

            /* eslint-disable no-fallthrough */

            case 13:
                if ((pp.state & Preprocessor.state.directive) !== 0)
                    return;

                if (this.input.charCodeAt(this.pos + 1) === 10)
                    ++this.pos;

                // fall through intentionally

                /* eslint-enable */

            case 10:
            case 8232:
            case 8233:
                if ((pp.state & Preprocessor.state.directive) !== 0)
                    return;

                ++this.pos;

                if (this.options.locations)
                {
                    ++this.curLine;
                    this.lineStart = this.pos;
                }

                // Inform the preprocessor that we saw eol
                pp.firstTokenOnLine = true;
                break;

            case 47: // '/'
                switch (this.input.charCodeAt(this.pos + 1))
                {
                    case 42: // '*'
                        this.skipBlockComment();
                        break;

                    case 47: // '/'
                        this.skipLineComment(2);
                        break;

                    default:
                        return;
                }

                break;

            case 92: // '\'
                if ((pp.state & Preprocessor.state.directive) === 0)
                    return;

                // The gcc docs say that newline must immediately follow
                ++this.pos;

                var haveNewline = false;

                ch = this.input.charCodeAt(this.pos);

                if (ch === 10)
                {
                    haveNewline = true;
                    ++this.pos;
                }
                else if (ch === 13)
                {
                    haveNewline = true;
                    ++this.pos;

                    if (this.input.charCodeAt(this.pos + 1) === 10)
                        ++this.pos;
                }

                if (!haveNewline)
                    this.raise(this.pos, "Expected EOL after '\\'");

                if (this.options.locations)
                {
                    ++this.curLine;
                    this.lineStart = this.pos;
                }

                // Keep reading, the '\' is treated as whitespace
                break;

            default:
                if ((ch > 8 && ch < 14) ||
                    (ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))))
                {
                    ++this.pos;
                }
                else
                {
                    return;
                }
        }
    }
};

acorn.Parser.prototype.objj_skipToEOL = function()
{
    while (true)
    {
        this.nextToken();

        if (this.type === tt.objj_eol || this.type === tt.eof)
            return;
    }
};

acorn.Parser.prototype.objj_skipToNextPreDirective = function()
{
    this.objj.preprocessor.skipping = true;

    while (true)
    {
        if (this.type === tt._objj_preprocess || this.type === tt.eof)
            return;

        this.nextToken();
    }
};

acorn.Parser.prototype.objj_getPreprocessorTokenFromCode = function(code)
{
    var pp = this.objj.preprocessor,
        token = null;

    switch (code)
    {
        case 35: // #
            ++this.pos;

            // # within a macro body might be a stringification or it might be ##
            if ((pp.state & Preprocessor.state.directive) !== 0)
            {
                code = this.input.charCodeAt(this.pos);

                if (code === 35)
                {
                    ++this.pos;
                    token = { type: tt.objj_preTokenPaste };
                    break;
                }

                token = this.objj_readToken_stringify();
                break;
            }

            // Preprocessor directives are only valid at the beginning of the line
            if (!pp.firstTokenOnLine)
                this.raise(--this.pos, "# must be the first non-whitespace character on a line");

            token = { type: tt._objj_preprocess };
            break;

        case 10:
        case 13:
        case 8232:
        case 8233:
        {
            // If we get here, we must be within a preprocessor directive,
            // otherwise skipSpace would have gone past this.
            pp.state ^= Preprocessor.state.directive;

            // Inform the preprocessor that we saw eol
            token = { type: tt.objj_eol };
            break;
        }

        default:
            break;
    }

    return token;
};

/*
    NOTE: We had to completely override readWord
    when using the preprocessor.
*/

acorn.Parser.prototype.objj_readWord = function()
{
    var word = this.readWord1(),
        pp = this.objj.preprocessor,
        type = tt.name;

    if ((this.options.ecmaVersion >= 6 || !this.containsEsc))
    {
        if (this.objj.options.preprocessor)
        {
            if (this.type === tt._objj_preprocess && this.objj_isPreprocessorKeyword(word))
            {
                pp.state |= Preprocessor.state.directive;

                return this.finishToken(preprocessorKeywordMap[word], word);
            }
            else if (!pp.skipping && (pp.state & Preprocessor.state.expandMacros) !== 0)
            {
                var macro = pp.getMacro(word);

                if (macro)
                    return pp.expandMacro(macro, pp.tokenStream);
            }
        }

        if (this.isKeyword(word))
            type = tt["_" + word];

        else if (this.objj.options.objj && this.objj_isObjjKeyword(word))
            type = tokenTypes.objjKeywords[word];
    }

    return this.finishToken(type, word);
};

acorn.Parser.prototype.objj_readTmplToken = function()
{
    this.objj.preprocessor.readTmplToken.call(this);
};

acorn.Parser.prototype.objj_readToken_stringify = function()
{
    this.skipSpace();
    this.next();

    // The next token should be a name
    if (this.type === tt.name)
        this.finishToken(tt.objj_stringifiedName, this.value);
    else
        this.raise(this.start, "# (stringify) must be followed by a name");

    return { type: tt.objj_stringifiedName, value: this.value };
};

acorn.Parser.prototype.objj_nextToken = function()
{
    this.objj.preprocessor.nextToken.apply(this, arguments);
};

acorn.Parser.prototype.objj_setStrict = function()
{
    this.objj.preprocessor.setStrict.apply(this, arguments);
};

acorn.Parser.prototype.objj_setToken = function(token)
{
    this.input = token.input;

    this.type = token.type;
    this.value = token.value;

    this.start = token.start;
    this.end = token.end;
    this.pos = token.pos;

    this.lastTokStart = token.lastTokStart;
    this.lastTokEnd = token.lastTokEnd;

    if (this.options.locations)
    {
        this.curLine = token.curLine;
        this.lineStart = token.lineStart;
        this.startLoc = token.startLoc;
        this.endLoc = token.endLoc;

        this.lastTokStartLoc = token.lastTokStartLoc;
        this.lastTokEndLoc = token.lastTokEndLoc;
    }

    this.context = token.context;
    this.exprAllowed = token.exprAllowed;
    this.strict = token.strict;
    this.inModule = token.inModule;
    this.potentialArrowAt = token.potentialArrowAt;
    this.inFunction = token.inFunction;
    this.inGenerator = token.inGenerator;
    this.labels = token.labels;

    this.objj.preprocessor.firstTokenOnLine = token.firstTokenOnLine;
};
