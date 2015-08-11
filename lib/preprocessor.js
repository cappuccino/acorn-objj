"use strict";

var acorn = require("acorn"),
    tokenTypes = require("./token-types"),
    utils = require("./utils");

// jscs: disable requireMultipleVarDecl

var tt = acorn.tokTypes,
    TokenType = acorn.TokenType;

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
    preprocessorKeywordMap = {};

// jscs: enable

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

exports.init = function(parser)
{
    var pp = acorn.Parser.prototype;

    utils.extendParser(parser, "skipSpace", pp.objj_skipSpace);
    utils.extendParser(parser, "nextToken", pp.objj_nextToken);
    utils.extendParser(parser, "setStrict", pp.objj_setStrict);
    utils.extendParser(parser, "readTmplToken", pp.objj_readTmplToken);
    utils.extendParser(parser, "readWord1", pp.objj_readWord1);
    utils.extendParser(parser, "finishNode", pp.objj_finishNode);
    utils.extendParser(parser, "parseTopLevel", pp.objj_parseTopLevel);

    var pre = parser.objj.preprocessor = new Preprocessor(parser);

    utils.extendParser(parser, "parse", pre.parse.bind(pre));
};

acorn.Parser.prototype.objj_resetParser = function()
{
    // Create a vanilla Parser and copy its state except for plugins
    var plugins = this.options.plugins;

    this.options.plugins = {};

    var parser = new acorn.Parser(this.options, ""),
        pp = this.objj.preprocessor;

    this.options.plugins = plugins;
    parser.input = pp.source;
    this.objj_setToken(parser);

    pp.state = Preprocessor.state_default;
    pp.firstTokenOnLine = true;
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

// This object manages the preprocessor state.
var Preprocessor = function(parser, macroList)
{
    this.parser = parser;

    // Tracks the state of the preprocessor engine.
    this.state = Preprocessor.state_default;

    // Preprocessor directives may only occur as the first token on a line.
    // We use this to track whether the next token is the first on the line.
    this.firstTokenOnLine = true;

    // Contains a hash of macro names to Macro objects.
    this.macros = Object.create(null);

    // If macroList is an array, it is populated with a list of
    // the non-predefined macros when parsing is finished.
    this.macroList = Array.isArray(macroList) ? macroList : null;

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
    //    state: preIf or preElse
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

// Not preprocessing
Preprocessor.state_none = 0;

// Determines whether macro names are looked up and expanded
Preprocessor.state_expandMacros = 1 << 0;

// Within a preprocessor directive
Preprocessor.state_directive = 1 << 1;

// Expanding a macro call
Preprocessor.state_macroExpansion = 1 << 2;

// Default state when not handling preprocessor directives
Preprocessor.state_default = Preprocessor.state_expandMacros;

// The state of an #if. When an #if is waiting for an #else or #endif, it is preIf.
// When there was an #else, it's preElse.
Preprocessor.preIf = 0;
Preprocessor.preElse = 1;

// Definitions for predefined macros.
Preprocessor.predefinedMacros =
{
    __OBJJ__: function(options)
    {
        return options.objj ? "1" : undefined;
    },
    __BROWSER__: function()
    {
        return (typeof window === "undefined") ? undefined : "\"" + window.navigator.userAgent + "\"";
    },
    __NODE__: function()
    {
        return (typeof process === "undefined") ? undefined : "\"" + process.version + "\"";
    }
};

Preprocessor.whitespaceRegex = /\s+/g;
Preprocessor.stringRegex = /(['"])((?:[^\\\"]+|\\.)*)\1/g;

Preprocessor.escapeNonPrintingChar = function(c)
{
    switch (c)
    {
        case "\"":
            return "\\\"";

        case "\n":
            return "\\n";

        case "\r":
            return "\\r";

        case "\t":
            return "\\t";

        case "\\":
            return "\\\\";

        case "\b":
            return "\\b";

        case "\v":
            return "\\v";

        case "\u00A0":
            return "\\u00A0";

        case "\u2028":
            return "\\u2028";

        case "\u2029":
            return "\\u2029";

        default:
            return c;
    }
};

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
                    if (old.parameters[i].type !== macro.parameters[i].type ||
                        old.parameters[i].value !== macro.parameters[i].value)
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
            console.warn("Warning: redefining the macro \"" + macro.name + "\"");
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
    for (var name in this.macros)
        if (this.macros.hasOwnProperty(name) && !Preprocessor.predefinedMacros.hasOwnProperty(name))
            this.macroList.push(this.macros[name]);
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

        if (definition)
        {
            if (typeof definition === "function")
            {
                definition = definition(this.parser.objj.options);

                if (definition == null)
                    continue;
            }

            definitions.push(name + "=" + definition);
        }
        else
            definitions.push(name);
    }

    this.defineMacros(definitions, true);
};

/*
    Defines a macro from an array of macro objects and/or text definitions in one of two formats:

    macro
    macro=body

    In the first case, the macro is defined with the value 1.
    In the second case, it must pass the normal parsing rules for macros.
*/
Preprocessor.prototype.defineMacros = function(definitions, predefined)
{
    for (var i = 0; i < definitions.length; ++i)
    {
        var macro = definitions[i];

        if (typeof macro === "string")
            this.defineMacro(macro, predefined);
        else if (!predefined && Preprocessor.predefinedMacros.hasOwnProperty(macro.name))
            this.parser.raise(0, "'" + macro.name + "' is a predefined macro name");
        else
            this.macros[macro.name] = macro;
    }
};

Preprocessor.prototype.defineMacro = function(definition, predefined)
{
    definition = definition.trim();

    var pos = definition.indexOf("=");

    if (pos === 0)
        this.parser.raise(0, "Invalid macro definition: '" + definition + "'");

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

    if (!predefined && Preprocessor.predefinedMacros.hasOwnProperty(name))
        this.parser.raise(0, "'" + name + "' is a predefined macro name");

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
    var oldExpand = this.state & Preprocessor.state_expandMacros;

    this.state &= ~Preprocessor.state_expandMacros;
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

Preprocessor.prototype.substituteMacroArguments = function(macro, args, bodyTokens)
{
    // The last possible token that can be pasted is the 3rd from last
    for (var i = 0, lastPasteIndex = macro.tokens.length - 3; i < macro.tokens.length; ++i)
    {
        var token = macro.tokens[i];

        if (token.type === tt.name || token.type === tt.objj_stringifiedName)
        {
            // First handle pasting, because pasted args are not macro expanded.
            // If there are at least two more tokens, and the next one is ##,
            // do the paste thing.
            if (i <= lastPasteIndex && macro.tokens[i + 1].type === tt.objj_preTokenPaste)
            {
                var index;

                if ((index = this.pasteTokenSeries(macro, args, bodyTokens, i, lastPasteIndex)) !== 0)
                {
                    i = index;
                    continue;
                }
            }

            if (this.lookupMacroParameter(macro, token))
            {
                var argTokens;

                if (token.type === tt.name)
                {
                    if (token.macroParameter.variadic)
                    {
                        argTokens = [];

                        // Variadic arg receives all of the args after the last non-variadic parameter declared.
                        // If no variadic args are passed, and the token is marked deletePreviousComma,
                        // delete the comma.
                        if (args.length < macro.parameters.length && token.deletePreviousComma === true)
                            bodyTokens.pop();
                        else
                        {
                            for (var vi = macro.parameters.length - 1; vi < args.length; ++vi)
                            {
                                Array.prototype.push.apply(argTokens, this.expandMacroArgument(args[vi]));

                                if (vi < args.length - 1)
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
                    else
                        argTokens = this.expandMacroArgument(args[token.macroParameter.index]);
                }
                else
                    argTokens = [this.stringifyMacroArgument(args[token.macroParameter.index])];

                if (argTokens.length !== 0)
                    Array.prototype.push.apply(bodyTokens, argTokens);

                continue;
            }
        }

        bodyTokens.push(token);
    }
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
            else if (c === "\"" || c === "'")
            {
                Preprocessor.stringRegex.lastIndex = i;
                match = Preprocessor.stringRegex.exec(str);

                if (match == null)
                {
                    // If the regex fails, the string was unterminated, so take whatever is left and stop
                    result += str.slice(i);
                    break;
                }
                else
                {
                    i = Preprocessor.stringRegex.lastIndex;

                    // A literal string has to escape double quotes, non-printing characters and backslashes
                    var escaped = match[2].replace(/["\n\r\t\\\b\v\f\u00A0\u2028\u2029]/g, Preprocessor.escapeNonPrintingChar),

                        // Finally enclose the result in backslashed quotes
                        quote = c === "\"" ? "\\\"" : "'";

                    result += quote + escaped + quote;
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
    var token = new PreprocessorToken(this.parser);

    token.input = result;
    token.type = tt.string;
    token.value = result.slice(1, -1);

    token.start = 0;
    token.end = result.end;

    return token;
};

Preprocessor.prototype.expandMacroBody = function(macro, nameToken, args, expandedTokens)
{
    // Expansion requires two passes. The first pass does argument substitution.
    var bodyTokens = [];

    if (macro.parameters.length > 0 || macro.isVariadic)
    {
        this.substituteMacroArguments(macro, args, bodyTokens);
    }
    else
    {
        // If the macro has no parameters, we can just iterate through its tokens.
        bodyTokens = macro.tokens;
    }

    // Second pass: expand macro calls.
    if (bodyTokens.length === 0)
        return;

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

Preprocessor.prototype.readFromSource = function()
{
    this.readTokensFromSource = true;

    var next = acorn.Parser.prototype.objj_callNext.bind(this.parser);

    this.nextToken = next;
    this.skipSpace = acorn.Parser.prototype.objj_sourceSkipSpace.bind(this.parser);
    this.setStrict = next;
    this.readTmplToken = next;
    acorn.tokContexts.objj_import.override = acorn.Parser.prototype.objj_readImportFilenameToken.bind(this.parser);
};

Preprocessor.prototype.readFromStream = function()
{
    this.readTokensFromSource = false;

    // When called, `this` is the Parser, so bind to the Preprocessor
    this.nextToken = this.streamNextToken.bind(this);
    this.skipSpace = this.streamSkipSpace.bind(this);
    this.setStrict = this.streamSetStrict.bind(this);
    this.readTmplToken = this.nextToken;
    acorn.tokContexts.objj_import.override = this.nextToken;
};

Preprocessor.prototype.parse = function(next)
{
    // Save the parser state
    var token = new PreprocessorToken(this);

    this.parser.skipSpace();
    this.addPredefinedMacros();
    this.defineMacros(this.parser.objj.options.macros || [], false);

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

Preprocessor.prototype.streamSetStrict = function(strict)
{
    this.parser.strict = strict;
};

Preprocessor.prototype.expectedPreEndif = function(pos, ifState, saw)
{
    this.parser.raise(
        this.parser.pos,
        "Expected #endif for #" + ifState.type.keyword +
        " at " + this.makeLineColumnDisplay(ifState.input, ifState.pos) +
        ", saw #" + saw
    );
};

// Builds a (line:column) string from input & offset or from a token object.
Preprocessor.prototype.makeLineColumnDisplay = function(tokenOrInput, offset)
{
    var lineInput,
        inputOffset;

    if (typeof tokenOrInput === "string")
    {
        lineInput = tokenOrInput;
        inputOffset = offset;
    }
    else
    {
        lineInput = tokenOrInput.input;
        inputOffset = tokenOrInput.start;
    }

    var pos = acorn.getLineInfo(lineInput, inputOffset);

    return "(" + pos.line + ":" + pos.column + ")";
};

// A macro object. Note that a macro can have no parameters but still
// be a function macro if it is defined with an empty parameter list.
var Macro = function(name, parameters, parameterMap, isFunction, isVariadic, tokens)
{
    this.name = name;

    // Tell the parameter its index, so when we lookup a parameter by name, we know its positional index
    for (var i = 0; i < parameters.length; ++i)
        parameters[i].index = i;

    this.parameters = parameters;
    this.parameterMap = parameterMap;
    this.isFunction = isFunction;
    this.isVariadic = isVariadic;
    this.tokens = tokens;
};

Macro.prototype.isParameter = function(name)
{
    return this.parameterMap[name] !== undefined;
};

Macro.prototype.getParameterByName = function(name)
{
    return this.parameterMap[name];
};

Macro.prototype.getName = function()
{
    return this.name;
};

var PreprocessorToken = function(preprocessor)
{
    var parser = preprocessor.parser;

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

acorn.Parser.prototype.objj_skipSpace = function()
{
    this.objj.preprocessor.skipSpace.apply(this, arguments);
};

acorn.Parser.prototype.objj_nextToken = function()
{
    this.objj.preprocessor.nextToken.apply(this, arguments);
};

acorn.Parser.prototype.objj_readTmplToken = function()
{
    this.objj.preprocessor.readTmplToken.call(this);
};

acorn.Parser.prototype.objj_setStrict = function()
{
    this.objj.preprocessor.setStrict.apply(this, arguments);
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
                if ((pp.state & Preprocessor.state_directive) !== 0)
                    return;

                if (this.input.charCodeAt(this.pos + 1) === 10)
                    ++this.pos;

                // fall through intentionally

                /* eslint-enable */

            case 10:
            case 8232:
            case 8233:
                if ((pp.state & Preprocessor.state_directive) !== 0)
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
                if ((pp.state & Preprocessor.state_directive) === 0)
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
                if ((ch > 8 && ch < 14) || (ch >= 5760 && acorn.nonASCIIwhitespace.test(String.fromCharCode(ch))))
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

acorn.Parser.prototype.objj_callNext = function(next)
{
    var args = Array.prototype.slice.call(arguments, 1);

    return next.apply(this, args);
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
            if ((pp.state & Preprocessor.state_directive) !== 0)
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
                this.raise(--this.pos, "Preprocessor directives may only be used at the beginning of a line");

            token = { type: tt._objj_preprocess };
            break;

        case 10:
        case 13:
        case 8232:
        case 8233:
        {
            // If we were within a directive, eol terminates the directive
            if ((pp.state & Preprocessor.state_directive) !== 0)
            {
                pp.state ^= Preprocessor.state_directive;

                // Inform the preprocessor that we saw eol
                token = { type: tt.objj_eol };
            }

            break;
        }

        default:
            break;
    }

    return token;
};

/*
    NOTE: We had to completely override readWord1 and readWord
    when using the preprocessor.
*/

function codePointToString(code)
{
    // UTF-16 Decoding
    if (code <= 0xFFFF)
        return String.fromCharCode(code);

    code -= 0x10000;

    return String.fromCharCode((code >> 10) + 0xD800, (code & 1023) + 0xDC00);
}

acorn.Parser.prototype.objj_readWord1 = function(next)
{
    // No need to override if we aren't in a preprocessor directive
    var pp = this.objj.preprocessor;

    if ((pp.state & Preprocessor.state_directive) === 0)
        return next.call(this);

    this.containsEsc = false;

    var word = "",
        first = true,
        chunkStart = this.pos,
        astral = this.options.ecmaVersion >= 6;

    while (this.pos < this.input.length)
    {
        var ch = this.fullCharCodeAtPos();

        if (acorn.isIdentifierChar(ch, astral))
        {
            this.pos += ch <= 0xffff ? 1 : 2;
        }
        else if (ch === 92) // "\"
        {
            // If we are in a directive, '\' is a line continuation
            if ((pp.state & Preprocessor.state_directive) !== 0)
                break;

            this.containsEsc = true;
            word += this.input.slice(chunkStart, this.pos);

            var escStart = this.pos;

            if (this.input.charCodeAt(++this.pos) !== 117) // "u"
                this.raise(this.pos, "Expecting Unicode escape sequence \\uXXXX");

            ++this.pos;

            var esc = this.readCodePoint();

            if (!(first ? acorn.isIdentifierStart : acorn.isIdentifierChar)(esc, astral))
                this.raise(escStart, "Invalid Unicode escape");

            word += codePointToString(esc);
            chunkStart = this.pos;
        }
        else
        {
            break;
        }

        first = false;
    }

    return word + this.input.slice(chunkStart, this.pos);
};

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
                pp.state |= Preprocessor.state_directive;

                return this.finishToken(preprocessorKeywordMap[word], word);
            }
            else if (!pp.skipping && (pp.state & Preprocessor.state_expandMacros) !== 0)
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

acorn.Parser.prototype.objj_finishNode = function(next, node, type)
{
    next.call(this, node, type);

    // If this node was made from the last macro token,
    // patch the end to point to the token's end.
    var pp = this.objj.preprocessor;

    if (pp.isLastMacroToken)
    {
        node.end = pp.lastMacroTokenEnd;

        if (this.options.locations)
            node.loc.end = pp.lastMacroTokenEndLoc;

        pp.isLastMacroToken = false;
    }

    return node;
};

acorn.Parser.prototype.objj_parseTopLevel = function(next, node)
{
    node = next.call(this, node);

    // If we are EOF at this point and something is left on the if stack, it was unterminated.
    var stack = this.objj.preprocessor.ifStack;

    if (this.type === tt.eof && stack.length > 0)
        this.raise(stack[0].pos, "Unterminated #" + stack[0].type.keyword + " at EOF");

    return node;
};

acorn.Parser.prototype.objj_parsePreprocess = function()
{
    // By default, macro expansion is off when processing preprocessor directives
    var node = this.startNode(),
        pp = this.objj.preprocessor;

    pp.state &= ~Preprocessor.state_expandMacros;
    pp.state |= Preprocessor.state_directive;
    this.next();

    var directive = this.type;

    switch (directive)
    {
        case tt._objj_pre_define:
            if (pp.skipping)
                this.objj_skipToEOL();
            else
                this.objj_parseDefine();
            break;

        case tt._objj_pre_undef:
            if (pp.skipping)
                this.objj_skipToEOL();
            else
            {
                this.next();

                var name = this.value;

                this.objj_expect(tt.name, "Expected a name after #undef");
                pp.undefineMacro(name);
            }

            break;

        case tt._objj_pre_if:
        case tt._objj_pre_ifdef:
        case tt._objj_pre_ifndef:
        case tt._objj_pre_elif:
            this.objj_parsePreIf();
            break;

        case tt._objj_pre_else:
            this.objj_parsePreElse();
            break;

        case tt._objj_pre_endif:
            this.objj_parsePreEndif();
            break;

        case tt._objj_pre_pragma:
            this.objj_skipToEOL();
            break;

        case this._objj_pre_error:
        case this._objj_pre_warning:
            if (pp.skipping)
                this.objj_skipToEOL();
            else
                this.objj_parsePreDiagnostic(directive);
            break;

        default:
            this.raise(this.start, "Invalid preprocessing directive: '" + this.value + "'");
    }

    // If we are EOF at this point and something is left on the if stack, it was unterminated.
    if (this.type === tt.eof && pp.ifStack.length > 0)
        this.raise(pp.ifStack[0].pos, "Unterminated #" + pp.ifStack[0].type.keyword + " at EOF");

    pp.state = Preprocessor.state_default;

    // Eat the EOL that should terminate every directive. We have to wait until this point
    // to do it so that the preprocessorState will allow a directive on the next line to be recognized.
    this.next();

    if (pp.skipping)
        this.objj_skipToNextPreDirective();

    if (this.type === tt.name)
    {
        // If the current token at this point is a name, it could be a macro because macro names
        // are not looked up during directive handling. We have to wait until now to expand the macro
        // to ensure it is defined and that comments/spaces before it are handled correctly.
        var macro = pp.getMacro(this.value);

        if (macro)
            return pp.expandMacro(macro, pp.tokenStream);
    }

    return this.finishNode(node, "PreprocessorStatement");
};

acorn.Parser.prototype.objj_parseDefine = function()
{
    this.next();

    var nameStart = this.start,
        nameEnd = this.end,
        name = this.value;

    this.objj_expect(tt.name, "Expected a name after #define");

    if (name === "__VA_ARGS__")
        this.raise(nameStart, "__VA_ARGS__ may only be used within the body of a variadic macro");
    else if (name === "defined")
        this.raise(nameStart, "'defined' may not be used as a macro name");

    var parameters = [],
        parameterMap = Object.create(null), // Don't inherit from Object
        isFunction = false,
        isVariadic = false,
        variadicParameterName = "__VA_ARGS__";

    // '(' Must follow directly after identifier to be a valid macro with parameters
    if (this.input.charCodeAt(nameEnd) === 40) // '('
    {
        // Read macro parameters
        this.expect(tt.parenL);
        isFunction = true;

        var expectComma = false,
            parameter;

        scanParameters:
        while (this.type !== tt.parenR)
        {
            if (expectComma)
            {
                this.objj_expect(tt.comma, "Expected ',' between macro parameters");
                expectComma = false;
            }
            else
            {
                /* eslint-disable no-fallthrough */

                switch (this.type)
                {
                    case tt.name:
                        var argName = this.value;

                        if (argName === "__VA_ARGS__")
                            this.raise(
                                this.start,
                                "__VA_ARGS__ may only be used within the body of a variadic macro"
                            );

                        if (parameterMap[argName] !== undefined)
                            this.raise(this.start, "'" + argName + "' has already been used as a parameter name");

                        this.next();

                        // If a name is followed by ..., it means the variadic args are named
                        if (this.type === tt.ellipsis)
                        {
                            variadicParameterName = argName;
                            continue;
                        }
                        else
                        {
                            parameter = {
                                name: argName,
                                expand: false,
                                stringify: false,
                                variadic: false
                            };

                            parameters.push(parameter);
                            parameterMap[parameter.name] = parameter;
                            expectComma = true;
                            break;
                        }

                    case tt.ellipsis:
                        isVariadic = true;

                        parameter = {
                            name: variadicParameterName,
                            expand: false,
                            stringify: false,
                            variadic: true
                        };

                        parameters.push(parameter);
                        parameterMap[parameter.name] = parameter;
                        this.next();

                        if (this.type !== tt.parenR)
                            this.raise(this.start, "Expect ')' after ... in a macro parameter list");

                        break scanParameters;

                    default:
                        this.raise(this.start, "Unexpected token in macro parameters");
                }
            }
        }

        this.next();
    }

    var tokens = [],
        pp = this.objj.preprocessor;

    // Read macro body tokens until eof or eol that is not preceded by '\'
    while (this.type !== tt.objj_eol && this.type !== tt.eof)
    {
        var token = new PreprocessorToken(pp);

        switch (this.type)
        {
            case tt.name:
            case tt.objj_stringifiedName:
                if (isVariadic)
                {
                    var lastName = parameters.last().name;

                    if (lastName !== "__VA_ARGS__" && this.value === "__VA_ARGS__")
                        this.raise(
                            this.start,
                            "__VA_ARGS__ may not be used when there are named variadic parameters"
                        );

                    // If the previous tokens were some value, a comma, and ##, and this token is the variadic
                    // parameter name, remove the ## token and mark this token as deleting a previous comma
                    // if no variadic args are passed.
                    if (lastName === variadicParameterName && parameters.length > 1 &&
                        tokens.length >= 3 &&
                        tokens.last().type === tt.objj_preTokenPaste &&
                        tokens[tokens.length - 2].type === tt.comma)
                    {
                        tokens.pop();
                        token.objj_deletePreviousComma = true;
                    }
                }
                else if (this.value === "__VA_ARGS__")
                    this.raise(this.start, "__VA_ARGS__ may only be used within the body of a variadic macro");
                break;

            default:
                break;
        }

        tokens.push(token);
        this.next();
    }

    // ## cannot be at the beginning or end
    if (tokens.length > 0)
    {
        if (tokens[0].type === tt.objj_preTokenPaste)
            this.raise(tokens[0].start, "## may not be at the beginning of a macro");
        else if (tokens.last().type === tt.objj_preTokenPaste)
            this.raise(tokens.last().start, "## may not be at the end of a macro");
    }

    pp.addMacro(new Macro(name, parameters, parameterMap, isFunction, isVariadic, tokens));
};

acorn.Parser.prototype.objj_parseMacroArguments = function(macro, context)
{
    var arg = { tokens: [] },

        // For error reporting, so we can point to the offending argument
        argStart = this.start,
        args = [],

        // Start with a parenLevel of 1, which represents the open parens of the macro call.
        // We stop scanning arguments when the level reaches zero.
        parenLevel = 1;

    // This label allows us to break out of the loop within the inner switch statement
    scanArguments:
    while (true)
    {
        switch (this.type)
        {
            case tt.parenL:
                ++parenLevel;
                break;

            case tt.parenR:
                if (--parenLevel === 0)
                {
                    // If there are no args so far and this one is empty, that means no args were passed.
                    // If there were args previously and this one is empty, it's an empty arg.
                    if (args.length > 0 || arg.tokens.length > 0)
                        args.push(arg);

                    // Don't go to the next token if we are nested, because we are already pointing
                    // just past the first token after the macro args.
                    if (context == null)
                    {
                        this.skipSpace();
                        this.next();
                    }

                    break scanArguments;
                }

                break;

            case tt.comma:

                // Commas are valid within an argument, if they are within parens.
                // If parenLevel === 1, the comma is an argument separator.
                if (parenLevel === 1)
                {
                    args.push(arg);

                    // If we have exceeded the formal parameters, no point in going further
                    if (!macro.isVariadic && args.length > macro.parameters.length)
                        break scanArguments;

                    arg = { tokens: [] };
                    this.skipSpace();
                    this.next();
                    argStart = this.start;
                    continue;
                }

                break;

            case tt.objj_eol:
                this.skipSpace();
                this.next();
                argStart = this.start;
                continue;

            case tt.eof:
                this.raise(this.pos, "Unexpected EOF in macro call");
                break;

            default:
                break;
        }

        arg.tokens.push(new PreprocessorToken(this.objj.preprocessor));
        this.skipSpace();
        this.next();
    }

    // If the macro is not variadic, argument count must equal the parameter count.
    // Variadic macros have no restrictions on the argument count.
    if (!macro.isVariadic && args.length !== macro.parameters.length)
    {
        this.raise(
            argStart,
            "Macro defines " + macro.parameters.length + " parameter" +
            (macro.parameters.length === 1 ? "" : "s") + ", called with " +
            args.length + " argument" + (args.length === 1 ? "" : "s")
        );
    }

    return args;
};

acorn.Parser.prototype.objj_parsePreIf = function()
{
    var startPos = this.start,
        type = this.type,
        pp = this.objj.preprocessor,
        state;

    if (type === tt._objj_pre_elif)
    {
        if (pp.ifStack.length === 0)
            this.raise(startPos, "#elif with unmatched #if");

        state = pp.ifStack.last();

        if (state.phase === Preprocessor.preElse)
            pp.expectedPreEndif(startPos, state, "elif");

        // If we were skipping, don't skip until we evaluate the expression.
        // If we were not skipping, we will skip now.
        pp.skipping = state.skipping = !state.skipping;
    }
    else
    {
        state = {
            type: type,
            input: this.input,
            pos: startPos,
            phase: Preprocessor.preIf,
            skipping: false
        };

        pp.ifStack.push(state);
    }

    if (pp.skipping)
    {
        this.objj_skipToEOL();

        return;
    }

    var value;

    if (type === tt._objj_pre_if || type === tt._objj_pre_elif)
    {
        var expr = this.objj_parsePreprocessExpression();

        value = this.objj_preprocessEvalExpression(expr);
    }
    else if (type === tt._objj_pre_ifdef || type === tt._objj_pre_ifndef)
    {
        this.next();

        if (this.type !== tt.name)
            this.raise(this.start, "Expected a name after #" + type.keyword);

        this.value = pp.isMacro(this.value);

        if (type === tt._objj_pre_ifndef)
            value = !value;

        this.next();
    }

    if (this.type !== tt.objj_eol)
        this.raise(startPos, "#" + type.keyword + " expressions must be followed by the token EOL");

    pp.skipping = state.skipping = !value;
};
