"use strict";

var acorn = require("acorn"),
    issueHandler = require("acorn-issue-handler"),
    utils = require("./utils.js");

// jscs: disable requireMultipleVarDecl

var tt = acorn.tokTypes;

// This object manages the preprocessor state.
var Preprocessor = function(parser)
{
    this.parser = parser;

    // Tracks the state of the preprocessor engine.
    this.state = Preprocessor.state.default;

    // Preprocessor directives may only occur as the first token on a line.
    // We use this to track whether the next token is the first on the line.
    this.firstTokenOnLine = true;

    // Contains a hash of macro names to Macro objects.
    this.macros = Object.create(null);

    // If macroList is an array, any non-predefined macros defined
    // during this parse are added to the arary.
    this.macroList = parser.objj.macroList;

    // When a macro is expanded, this stack stores state information.
    this.macroStack = [];

    // When a macro is expanded, the generated tokens go into this array.
    this.macroTokens = [];

    // Keep track of when we pop the last macro token
    this.isLastMacroToken = false;

    // When creating a node from a macro expansion, the end has to be
    // patched to point to the end of the last macro token.
    this.lastMacroTokenEnd = 0;
    this.lastMacroTokenEndLoc = null;

    // When expanding a macro, the tokens are stored in this array.
    // It is switched to point to macro arguments and macro body token streams
    // at various points during expansion.
    this.tokenStream = this.macroTokens;

    // When reading from a token stream, this index points to the next
    // token that will be returned from the current token stream.
    this.tokenStreamIndex = 0;

    // Token input can come from several sources: source code, macros passed
    // on the command line, and synthesized tokens (token pasting, stringification).
    // We set the parser's input accordingly, and save the original input here.
    this.source = parser.input;

    // Used to track the nesting of #if/#ifdef/#ifndef directives. Each element stores state info:
    //    pos: position of # in the #if, for error reporting if an unbalanced #else/#endif is found
    //    state: afterIf or afterElse
    //    skipping: true if the #if expression evaluated to false
    this.ifStack = [];

    // When skipping to #else/#endif, we set this flag.
    this.skipping = false;

    // When preprocessing, key functions are routed first to the source versions,
    // which read from the input. On the second pass, they are routed to the postprocess
    // versions, which read tokens from the preprocess token list.
    this.readFromSource();
};

// The following are bit flags that indicate various states we use
// to control the behavior of the lexer/parser.

var PreprocessorState = {
    // Not preprocessing
    none: 0,

    // Determines whether macro names are looked up and expanded
    expandMacros: 1 << 0,

    // Within a preprocessor directive
    directive: 1 << 1,

    // Expanding a macro call
    macroExpansion: 1 << 2
};

// jscs: enable

PreprocessorState.default = PreprocessorState.expandMacros;

// The state of an #if. When an #if is waiting for an #else or #endif, it is afterIf.
// When there was an #else, it's afterElse.
var PreprocessorIfState = {
    afterIf: 0,
    afterElse: 1
};

// Definitions for predefined macros
Preprocessor.predefinedMacros = Object.create(null);

Preprocessor.predefinedMacros.__CAPPUCCINO__ = 1;
Preprocessor.predefinedMacros.__PLATFORM__ = process.platform;
Preprocessor.predefinedMacros.__NODE__ = process.version;

Preprocessor.predefinedMacros.__OBJJ__ = function(parser)
{
    return parser.objj.options.objj ? 1 : undefined;
};

Preprocessor.predefinedMacros.__ECMA_VERSION__ = function(parser)
{
    return parser.options.ecmaVersion;
};

Preprocessor.whitespaceRegex = /\s+/g;

function init(parser)
{
    var pp = acorn.Parser.prototype;

    utils.extendParser(parser, "skipSpace", pp.objj_skipSpace);
    utils.extendParser(parser, "nextToken", pp.objj_nextToken);
    utils.extendParser(parser, "readTmplToken", pp.objj_readTmplToken);
    utils.extendParser(parser, "readWord", pp.objj_readWord);
    utils.extendParser(parser, "finishNode", pp.objj_finishNode);
    utils.extendParser(parser, "parseTopLevel", pp.objj_parseTopLevel);

    var pre = parser.objj.preprocessor = new Preprocessor(parser);

    utils.extendParser(parser, "parse", pre.parse.bind(pre));
}

Preprocessor.prototype.addMacro = function(macro)
{
    var old = this.macros[macro.name];

    if (old)
    {
        /*
            GCC preprocessor docs section 3.8 say that macros are effectively the same if:

            - Both are the same type (object/function)
            - All of the tokens are the same
            - Parameters (if any) are the same
        */
        var same = true;

        if (old.isFunction === macro.isFunction &&
            old.isVariadic === macro.isVariadic &&
            old.parameters.length === macro.parameters.length &&
            old.tokens.length === macro.tokens.length)
        {
            var i;

            // Check parameters first if they are function macros
            if (old.isFunction)
            {
                for (i = 0; i < old.parameters.length; ++i)
                {
                    if (old.parameters[i].name !== macro.parameters[i].name ||
                        old.parameters[i].variadic !== macro.parameters[i].variadic)
                    {
                        same = false;
                        break;
                    }
                }
            }

            // Now check the body if necessary
            if (same)
            {
                for (i = 0; i < old.tokens.length; ++i)
                {
                    if (old.tokens[i].type !== macro.tokens[i].type ||
                        old.tokens[i].value !== macro.tokens[i].value)
                    {
                        same = false;
                        break;
                    }
                }
            }
        }
        else
            same = false;

        if (!same)
        {
            issueHandler.addWarning(
                this.parser.objj.issues,
                this.parser.input,
                this.parser.objj.file,
                new acorn.SourceLocation(
                    this.parser,
                    macro.start,
                    macro.start + macro.name.length
                ),
                "'" + macro.name + "' macro redefined"
            );
        }
    }

    this.macros[macro.name] = macro;
};

Preprocessor.prototype.getMacro = function(name)
{
    return this.macros[name];
};

// Return the macro with the given name, but only if it is not self-referential.
Preprocessor.prototype.lookupMacro = function(name, isArg)
{
    var macro = this.getMacro(name);

    // Comparing isArg !== true is faster than !isArg, because testing a non-boolean
    // for falseness is very slow.
    if (macro && isArg !== true && this.isMacroSelfReference(macro))
        macro = undefined;

    return macro;
};

// Check to see if a macro reference in a macro body is recursive.
// Note that macro calls during argument expansion are not included in the check.
Preprocessor.prototype.isMacroSelfReference = function(macro)
{
    var count = this.macroStack.length;

    while (count--)
    {
        if (this.macroStack[count].macro === macro)
            return true;
    }

    return false;
};

Preprocessor.prototype.undefineMacro = function(name)
{
    delete this.macros[name];
};

Preprocessor.prototype.isMacro = function(name)
{
    return this.macros[name] !== undefined;
};

// Populates this.macroList with non-predefined Macro objects
Preprocessor.prototype.getMacroList = function()
{
    // this.macros has no prototype, don't need to check hasOwnProperty
    for (var name in this.macros)
    {
        if (!(name in Preprocessor.predefinedMacros))
        {
            // noinspection JSUnfilteredForInLoop
            var macro = this.macros[name];

            // Convert the macro to a text definition in the form macro=body
            this.macroList.push(macro.declaration + "=" + macro.body);
        }
    }
};

Preprocessor.prototype.pushMacro = function(macro, context)
{
    var state;

    if (context == null)
    {
        // If we are reading from source, clear macroTokens to receive a new expansion
        this.macroTokens.splice(0, this.macroTokens.length);
        this.tokenStreamIndex = 0;
        state = {
            macro: macro,
            lastTokStart: this.parser.lastTokStart,
            lastTokEnd: this.parser.lastTokEnd
        };
    }
    else
    {
        state = {
            macro: macro,
            readFromSource: this.readTokensFromSource,
            tokenStream: this.tokenStream,
            tokenStreamIndex: this.tokenStreamIndex
        };

        this.tokenStream = context.tokens;
        this.tokenStreamIndex = context.tokenIndex;
    }

    this.macroStack.push(state);

    // If we are nested, we are reading from a token stream, not input
    if (this.macroStack.length === 2)
        this.readFromStream();
};

Preprocessor.prototype.pushToken = function(token)
{
    this.macroTokens.push(token);
};

Preprocessor.prototype.popMacro = function(context)
{
    var state = this.macroStack.pop();

    if (context)
    {
        // Communicate to the macro caller where we stopped parsing its token stream.
        context.tokenIndex = this.tokenStreamIndex - 1;

        if (state.readFromSource)
            this.readFromSource();
        else
            this.readFromStream();

        this.tokenStream = state.tokenStream;
        this.tokenStreamIndex = state.tokenStreamIndex;
    }
};

Preprocessor.prototype.addPredefinedMacros = function()
{
    var names = Object.keys(Preprocessor.predefinedMacros),
        definitions = [];

    for (var i = 0; i < names.length; ++i)
    {
        var name = names[i],
            definition = Preprocessor.predefinedMacros[name];

        if (typeof definition === "function")
        {
            definition = definition(this.parser);

            if (definition == null)
                continue;
        }

        // Wrap strings in quotes for the parser
        if (typeof definition === "string")
            definition = "\"" + definition + "\"";

        definitions.push(name + "=" + definition);
    }

    this.defineMacros(definitions);
};

/*
    Defines a macro from an array of text definitions in one of two formats:

    macro
    macro=body

    In the first case, the macro is defined with the value 1.
    In the second case, it must pass the normal parsing rules for macros.
*/
Preprocessor.prototype.defineMacros = function(definitions)
{
    for (var i = 0; i < definitions.length; ++i)
        this.defineMacro(definitions[i]);
};

Preprocessor.prototype.defineMacro = function(definition)
{
    definition = definition.trim();

    var pos = definition.indexOf("=");

    if (pos === 0)
        this.parser.raise(0, "Invalid option-defined macro definition: '" + definition + "'");

    // If there is no macro body, define the name with the value 1
    var name, body;

    if (pos > 0)
    {
        name = definition.slice(0, pos);
        body = definition.slice(pos + 1);
    }
    else
    {
        name = definition;
        body = "1";
    }

    this.parser.objj_resetParser();

    // We definitely don't want allow-hash-bang
    this.parser.options.allowHashBang = false;

    // Construct a definition that objj_parseDefine can digest.
    this.parser.input = name + " " + body;
    this.parser.skipSpace();
    this.parser.objj_parseDefine();

    // It's safe to leave the parser in the current state because
    // objj_resetParser will be called again before the main source is parsed.
};

/*
    When we expand a macro from source, we have to replace the macro invocation tokens
    with the tokens generated by expanding the macro. So here is the strategy:

    - When we get to here, the state is as follows:

    pos: end of the macro name
    type: type of the previous token
    lastTokStart, lastTokEnd: start/end of the previous token

    - Save lastTokStart, lastTokEnd.

    - Call finishToken() and save the state of the macro name token.

    - Parse the macro's args (if any). At that point we will have reached the token
    after the last token in the macro call:

    pos: end of the token
    type: type of the token
    lastTokStart, lastTokEnd: start/end of the last token in the macro call

    - If the macro is a function macro but did not have any arguments, it will be inserted
    as a regular name, in which case we don't do anything special.

    - Otherwise, for the purposes of generating positions in the AST, we want to ignore the tokens
    in the macro call. So we set lastTokStart/lastTokEnd to start/end to that of the token
    *before* the macro call, then save that state as a token.

    - Expand the macro call into an array of tokens.

    - Append the adjusted token after the macro call to the token array.

    - Tell the parser to read tokens from the stream.

    - Call next() to load the first generated token.

    - When nextToken() exhausts the macro token array, tell the parser
    to read from source so the next token will come from the source.

    Note that no attempt is made to capture comments or space before or after a macro call.
*/
Preprocessor.prototype.expandMacro = function(macro, expandedTokens, context)
{
    // We actually do not want to expand macros automatically here, it is done explicitly
    var oldExpand = this.state & Preprocessor.state.expandMacros;

    this.state &= ~Preprocessor.state.expandMacros;
    this.pushMacro(macro, context);

    // Save the macro name as a token in case it is a function macro which has no arguments
    this.parser.finishToken(tt.name, macro.name);

    var nameToken = new PreprocessorToken(this),
        savedState = this.state;

    this.parser.next();

    var isMacroCall = true,
        args = null,
        tokenAfterMacro;

    if (macro.isFunction)
    {
        // A function macro that has no arguments is treated as a name
        if (this.parser.eat(tt.parenL))
            args = this.parser.objj_parseMacroArguments(macro, context);
        else
            isMacroCall = false;
    }

    // We are now pointing at the token after the last one in the macro call.
    // If the macro will be expanded, save some state.
    if (context == null)
    {
        if (isMacroCall)
        {
            // Save an adjusted version of the current token as outlined above
            var stateBefore = this.macroStack[0];

            this.parser.lastTokStart = stateBefore.lastTokStart;
            this.parser.lastTokEnd = stateBefore.lastTokEnd;
            tokenAfterMacro = new PreprocessorToken(this);
        }
    }
    else if (args == null)
    {
        // If the macro has no args and is nested and we have not reached the end of
        // the token stream, the next() above pushed us past the token *after* the macro call,
        // which the caller will want to read again. So we back up one token in the stream.
        if (this.parser.type !== tt.eof)
            --this.tokenStreamIndex;
        else if (!isMacroCall)
        {
            // On the other hand, if we have reached eof and the macro is not being called,
            // we have to append it as a name.
            expandedTokens.push(nameToken);
        }
    }

    if (isMacroCall)
        this.expandMacroBody(macro, nameToken, args, expandedTokens);

    this.state = savedState;
    this.popMacro(context);

    if (context == null)
    {
        if (isMacroCall)
        {
            this.pushToken(tokenAfterMacro);
            this.readFromStream();
            this.parser.next();
        }
        else
        {
            this.parser.objj_setToken(nameToken);
            this.skipSpace();
        }
    }

    this.state |= oldExpand;

    return isMacroCall;
};

Preprocessor.prototype.expandMacroArgument = function(arg)
{
    // Store the expanded tokens on the arg so we don't expand
    // every time the arg is used.
    if (arg.expandedTokens == null)
    {
        arg.expandedTokens = [];

        for (var i = 0; i < arg.tokens.length; ++i)
        {
            var token = arg.tokens[i];

            if (token.type === tt.name)
            {
                // true means this is a macro argument, which may be self-referential
                var nestedMacro = this.lookupMacro(token.value, true);

                if (nestedMacro)
                {
                    var context = {
                        tokens: arg.tokens,
                        tokenIndex: i + 1
                    };

                    if (this.expandMacro(nestedMacro, arg.expandedTokens, context))
                        i = context.tokenIndex;

                    continue;
                }
            }

            arg.expandedTokens.push(token);
        }
    }

    return arg.expandedTokens;
};

Preprocessor.prototype.expandVariadicParameters = function(macro, args, token, bodyTokens, argTokens)
{
    // Variadic arg receives all of the args after the last declared
    // non-variadic parameter. If no variadic args are passed, and
    // the token is marked deletePreviousComma, delete the comma.
    if (args.length < macro.parameters.length && token.objj_deletePreviousComma === true)
        bodyTokens.pop();
    else
    {
        for (var i = macro.parameters.length - 1; i < args.length; ++i)
        {
            Array.prototype.push.apply(argTokens, this.expandMacroArgument(args[i]));

            if (i < args.length - 1)
            {
                argTokens.push(
                    {
                        input: ",",
                        start: 0,
                        end: 2,
                        type: tt.comma,
                        value: ","
                    }
                );
            }
        }
    }
};

Preprocessor.prototype.expandMacroBody = function(macro, nameToken, args, expandedTokens)
{
    var bodyTokens = [];

    // Expansion requires two passes. The first pass does argument substitution and pasting.
    this.expandMacroFirstPass(macro, args, bodyTokens);

    if (bodyTokens.length === 0)
        return;

    // Second pass: expand macro calls.
    this.expandMacroSecondPass(bodyTokens, expandedTokens);
};

Preprocessor.prototype.expandMacroFirstPass = function(macro, args, expandedTokens)
{
    var expandArgs = macro.parameters.length > 0 || macro.isVariadic;

    // The last possible token that can be pasted is the 3rd from last
    for (var i = 0, lastPasteIndex = macro.tokens.length - 3; i < macro.tokens.length; ++i)
    {
        // First handle pasting, because pasted args are not macro expanded.
        // If there are at least two more tokens, and the next one is ##,
        // do the paste thing.
        if (i <= lastPasteIndex && macro.tokens[i + 1].type === tt.objj_preTokenPaste)
        {
            i = this.pasteTokenSeries(macro, args, expandedTokens, i, lastPasteIndex);
            continue;
        }

        var token = macro.tokens[i];

        if (expandArgs &&
            (token.type === tt.name || token.type === tt.objj_stringifiedName) &&
            this.lookupMacroParameter(macro, token))
        {
            var argTokens = [];

            if (token.type === tt.name)
            {
                if (token.macroParameter.variadic)
                    this.expandVariadicParameters(macro, args, token, expandedTokens, argTokens);
                else
                    argTokens = this.expandMacroArgument(args[token.macroParameter.index]);
            }
            else
                argTokens = [this.stringifyMacroArgument(args[token.macroParameter.index])];

            if (argTokens.length !== 0)
                Array.prototype.push.apply(expandedTokens, argTokens);

            continue;
        }

        expandedTokens.push(token);
    }
};

Preprocessor.prototype.expandMacroSecondPass = function(bodyTokens, expandedTokens)
{
    for (var i = 0; i < bodyTokens.length; ++i)
    {
        var token = bodyTokens[i];

        if (token.type === tt.name)
        {
            var nestedMacro = this.lookupMacro(token.value);

            if (nestedMacro)
            {
                // tokenIndex: i + 1 because the index points to the macro name, we want to start parsing after that
                var context = {
                        tokens: bodyTokens,
                        tokenIndex: i + 1
                    };

                if (this.expandMacro(nestedMacro, expandedTokens, context))
                    i = context.tokenIndex;

                continue;
            }
        }

        expandedTokens.push(token);
    }
};

Preprocessor.prototype.pasteTokenSeries = function(macro, args, expandedTokens, i, lastPasteIndex)
{
    // When we enter this function, it has already been established that there
    // is a valid paste in the next two tokens.
    var pastedTokens = [];

    do
    {
        // If there was a previous paste, the left token is the last token of the result,
        // otherwise it's the current macro token. The right token will always be the macro token
        // after ##.
        var leftToken = pastedTokens.length === 0 ? macro.tokens[i] : pastedTokens.last();

        this.pasteTokens(leftToken, macro, i, args, pastedTokens);

        // Continue from the right token
        i += 2;
    }
    while (i <= lastPasteIndex && macro.tokens[i + 1].type === tt.objj_preTokenPaste);

    Array.prototype.push.apply(expandedTokens, pastedTokens);

    return i;
};

Preprocessor.prototype.pasteTokens = function(leftToken, macro, index, args, pastedTokens)
{
    var rightToken = macro.tokens[index + 2],
        toks = [leftToken, rightToken],
        tokensToPaste = [null, null];

    for (var i = 0; i < toks.length; ++i)
    {
        if (this.lookupMacroParameter(macro, toks[i]))
        {
            var arg = args[toks[i].macroParameter.index];

            if (arg.tokens.length !== 0)
            {
                // When pasting, arguments are *not* expanded, but they can be stringified
                if (toks[i].type === tt.name)
                    tokensToPaste[i] = arg.tokens.slice();
                else // type === _stringifiedName
                    tokensToPaste[i] = [this.stringifyMacroArgument(arg)];
            }
        }
        else
            tokensToPaste[i] = [toks[i]];
    }

    // Only paste if both tokens are non-empty.
    var doPaste = tokensToPaste[0] !== null && tokensToPaste[1] !== null;

    if (doPaste)
    {
        // Take the last token from the left side and first from the right,
        // they will be pasted together if possible. Everything else is
        // appended as is.
        leftToken = tokensToPaste[0].pop();
        rightToken = tokensToPaste[1].shift();

        // If we are going to paste, and there are tokens from a previous paste
        // in the series, then we have to replace the last token with the pasted one.
        if (pastedTokens.length !== 0)
            pastedTokens.pop();
    }

    if (tokensToPaste[0] !== null)
        Array.prototype.push.apply(pastedTokens, tokensToPaste[0]);

    if (doPaste)
    {
        var leftText = leftToken.input.slice(leftToken.start, leftToken.end),
            rightText = rightToken.input.slice(rightToken.start, rightToken.end),
            tokenText = leftText + rightText,
            pastedToken = this.lexToken(tokenText);

        if (pastedToken === null)
        {
            issueHandler.addWarning(
                this.parser.objj.issues,
                this.parser.input,
                this.parser.objj.file,
                macro.tokens[index + 1],
                "pasting formed '%s', an invalid token",
                tokenText
            );

            pastedTokens.push(leftToken, rightToken);
        }
        else
            pastedTokens.push(pastedToken);
    }

    if (tokensToPaste[1] !== null)
        Array.prototype.push.apply(pastedTokens, tokensToPaste[1]);
};

Preprocessor.prototype.lexToken = function(text)
{
    var token = null;

    try
    {
        // We don't want preprocessor active during lexing of paste tokens
        this.parser.objj.options.preprocessor = false;

        var tokenizer = acorn.tokenizer(text, this.parser.options);

        token = tokenizer.getToken();

        // If tokEnd did not reach the end of the text,
        // the entire text was not a single token and thus is invalid.
        if (token !== null && token.end < text.length)
            token = null;
        else
            token = new PreprocessorToken(this, tokenizer);
    }
    catch (ex)
    {
        // Nothing to do, null token is what we want
    }

    this.parser.objj.options.preprocessor = true;

    return token;
};

Preprocessor.prototype.stringifyMacroArgument = function(arg)
{
    if (arg.stringifiedTokens == null)
        arg.stringifiedTokens = this.stringifyTokens(arg.tokens);

    return arg.stringifiedTokens;
};

Preprocessor.prototype.lookupMacroParameter = function(macro, token)
{
    if (token.type === tt.name || token.type === tt.objj_stringifiedName)
    {
        if (token.macroParameter == null)
            token.macroParameter = macro.getParameterByName(token.value);

        return !!token.macroParameter;
    }

    return false;
};

Preprocessor.prototype.stringifyTokens = function(tokens)
{
    var result = "\"";

    if (tokens.length !== 0)
    {
        var start = tokens[0].start,
            end = tokens.last().end,

            // gcc spec says leading and trailing whitespace is trimmed
            str = tokens[0].input.slice(start, end).trim(),
            i = 0;

        while (i < str.length)
        {
            var c = str.charAt(i),

                // gcc spec says any sequence of whitespace is converted to a single space
                match = Preprocessor.whitespaceRegex.exec(c);

            if (match)
            {
                Preprocessor.whitespaceRegex.lastIndex = i;
                match = Preprocessor.whitespaceRegex.exec(str);
                result += " ";
                i = Preprocessor.whitespaceRegex.lastIndex;
                Preprocessor.whitespaceRegex.lastIndex = 0;
            }
            else if (c === "\"")
            {
                var stringRegex = new RegExp(c + "(?:[^\\\\" + c + "]|\\\\.)*" + c, "g");

                stringRegex.lastIndex = i;
                match = stringRegex.exec(str);

                if (match == null)
                {
                    // If the regex fails, the string was unterminated, so take whatever is left and stop
                    result += str.slice(i);
                    break;
                }
                else
                {
                    i = stringRegex.lastIndex;

                    // A literal string has to escape quotes and backslashes
                    result += match[0].replace(new RegExp("([" + c + "\\\\])", "g"), "\\$&");
                }
            }
            else
            {
                result += c;
                ++i;
            }
        }
    }

    result += "\"";

    // Construct a new string token
    var token = new PreprocessorToken(this);

    token.input = result;
    token.type = tt.string;
    token.value = result.slice(1, -1);

    token.start = 0;
    token.end = result.end;

    return token;
};

Preprocessor.prototype.readFromSource = function()
{
    this.readTokensFromSource = true;

    var next = acorn.Parser.prototype.objj_callNext.bind(this.parser);

    this.nextToken = next;
    this.skipSpace = acorn.Parser.prototype.objj_sourceSkipSpace.bind(this.parser);
    this.readTmplToken = next;
    acorn.tokContexts.objj_import.override = acorn.Parser.prototype.objj_readImportFilenameToken.bind(this.parser);
};

Preprocessor.prototype.readFromStream = function()
{
    this.readTokensFromSource = false;

    // When called, `this` is the Parser, so bind to the Preprocessor
    this.nextToken = this.streamNextToken.bind(this);
    this.skipSpace = this.streamSkipSpace.bind(this);
    this.readTmplToken = this.nextToken;
    acorn.tokContexts.objj_import.override = this.nextToken;
};

Preprocessor.prototype.parse = function(next)
{
    // Save the parser state
    var token = new PreprocessorToken(this);

    this.parser.skipSpace();
    this.addPredefinedMacros();
    this.defineMacros(this.parser.objj.options.macros || /* istanbul ignore next */ []);

    // Restore the parser state
    this.parser.objj_setToken(token);

    var result = next.call(this.parser);

    if (this.macroList)
        this.getMacroList();

    return result;
};

Preprocessor.prototype.streamNextToken = function()
{
    if (this.tokenStreamIndex < this.tokenStream.length)
    {
        this.parser.objj_setToken(this.tokenStream[this.tokenStreamIndex++]);

        /*
         If we are replaying macro tokens, there is extra housecleaning to do:

         - If this is the next to last token, it's the last token
         in the actual macro, and we need to record its end location.

         - If the macro token stream has been exhausted, go back to reading
         from source.
         */

        if (this.tokenStream === this.macroTokens)
        {
            if (this.tokenStreamIndex === this.tokenStream.length - 1)
            {
                this.isLastMacroToken = true;
                this.lastMacroTokenEnd = this.parser.end;
                this.lastMacroTokenEndLoc = this.parser.endLoc;
            }
            else if (this.tokenStreamIndex === this.tokenStream.length)
                this.readFromSource();
        }
    }
    else
        this.parser.finishToken(tt.eof);
};

Preprocessor.prototype.streamSkipSpace = function()
{
    // no-op
};

module.exports = Preprocessor;
module.exports.state = PreprocessorState;
module.exports.ifState = PreprocessorIfState;
module.exports.init = init;

// Require other files that define acorn.Parser methods referenced here.
// We have to wait until the end of this file because the other files
// have a circular dependency on this file.
var PreprocessorToken = require("./pre-tokenize.js").PreprocessorToken;

require("./pre-parser.js");
require("./pre-statements.js");
require("./pre-expressions.js");
