"use strict";

var acorn = require("acorn"),
    issueHandler = require("acorn-issue-handler"),
    format = require("util").format,
    utils = require("./utils.js");

// jscs: disable requireMultipleVarDecl

var tt = acorn.tokTypes;

/**
 * Properties available in MacroExpansionState objects.
 *
 * @typedef {object} MacroExpansionStateType
 *
 * @property {Macro} macro - The macro that is being called.
 * @property {?Macro} caller - The macro that called this macro for call type, or null otherwise.
 * @property {MacroExpansionType} type - The type of expansion in which the call occurred.
 * @property {string} input - The source code of this macro.
 * @property {number} start - The start position of the first token in this call.
 * @property {number} end - The end position of the first token in this call.
 * @property {TokenSource} tokenSource - Where tokens were being read from when the macro was called.
 * @property {PreprocessorToken[]} stream - For nested macro calls, the token stream being parsed.
 * @property {number} streamIndex - For nested macro calls, the index of the current token.
 */

/**
 * Used to store info about macro expansions: calls, arg expansions, and body expansions.
 *
 * @class
 * @param {Macro} macro - The macro that is being called.
 * @param {?Macro} caller - The macro that called this macro for call type, or null otherwise.
 * @param {MacroExpansionType} type - The type of expansion in which the call occurred.
 * @param {string} input - The source code of this macro.
 * @param {number} start - The start position of the first token in this call.
 * @param {number} end - The end position of the first token in this call.
 * @param {PreprocessorToken[]} stream - For nested macro calls, the token stream being parsed.
 * @param {number} streamIndex - For nested macro calls, the index of the current token.
 */
var MacroExpansionState = function(macro, caller, type, input, start, end, stream, streamIndex)
{
    this.macro = macro;
    this.caller = caller;
    this.type = type;
    this.input = input;
    this.start = start;
    this.end = end;
    this.stream = stream;
    this.streamIndex = streamIndex;
};

/**
 * @typedef {object} MacroCallContext
 *
 * @property {Macro} caller - The macro that is making the call.
 * @property {MacroExpansionType} type - Which type of expansion generated the call.
 * @property {PreprocessorToken[]} tokens - The stream of tokens being parsed.
 * @property {number} tokenIndex - The index of the current token in the stream.
 */

/**
 * Properties available in MacroArgument objects.
 *
 * @typedef {MacroArgument} MacroArgumentType
 * @property {Macro} macro
 * @property {string} input - Source code where argument is found.
 * @property {number} start - Start position of argument.
 * @property {number} end - End position of argument.
 * @property {PreprocessorToken[]} tokens - The source tokens that make up this arg.
 * @property {PreprocessorToken[]} expandedTokens - The expanded version of this.tokens.
 * @property {MacroExpansionState[]} expansions - A record of the expansion's of the arg.
 */

/**
 * When a macro is called, the parsed arguments are stored in these [objects]{@link MacroArgumentType}.
 *
 * @class
 * @param {Macro} macro
 * @param {acorn.Parser} parser
 */
var MacroArgument = function(macro, parser)
{
    this.macro = macro;
    this.input = parser.input;
    this.start = parser.start;
    this.end = parser.end;
    this.tokens = [];
    this.expandedTokens = null;
    this.expansions = [];
};

exports.MacroArgument = MacroArgument;

/**
 * @enum {number} TokenSource
 * @const
 */
var TokenSource = {
        source: 1,
        stream: 2
    };

// The following are bit flags that indicate various states we use
// to control the behavior of the lexer/parser.
var PreprocessorState = {
        // Not preprocessing
        none: 0,

        // Determines whether macro names are looked up and expanded
        expandMacros: 1 << 0,

        // Within a preprocessor directive
        directive: 1 << 1
    };

PreprocessorState.default = PreprocessorState.expandMacros;
exports.PreprocessorState = PreprocessorState;

// The state of an #if. When an #if is waiting for an #else or #endif, it is afterIf.
// When there was an #else, it's afterElse.
var PreprocessorIfState = {
        afterIf: 0,
        afterElse: 1
    };

exports.PreprocessorIfState = PreprocessorIfState;

/**
 * @enum {number} MacroExpansionType
 * @const
 */
var MacroExpansionType = {
        /** The initial call to a macro */
        call: 1,

        /** Argument expansion */
        arg: 2,

        /** Body expansion */
        body: 3,

        /** Pasting tokens */
        pasting: 4,

        /** A synthesized token from pasting or stringification */
        synthesizedToken: 5
    };

/**
 * This object manages the preprocessor state.
 *
 * @class
 * @param {acorn.Parser} parser
 */
var Preprocessor = function(parser)
{
    this.parser = parser;

    // Tracks the state of the preprocessor engine.
    this.state = PreprocessorState.default;

    // Preprocessor directives may only occur as the first token on a line.
    // We use this to track whether the next token is the first on the line.
    this.firstTokenOnLine = true;

    // Contains a hash of macro names to Macro objects.
    this.macros = Object.create(null);

    // If macroList is an array, any non-predefined macros defined
    // during this parse are added to the arary.
    this.macroList = parser.objj.macroList;

    // When a macro is expanded, this stack stores state information.
    this.macroExpansionStack = [];

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
    this.stream = this.macroTokens;

    // When reading from a token stream, this index points to the *next*
    // token that will be returned from the current token stream.
    this.streamIndex = 0;

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

// jscs: enable

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

Preprocessor.prototype.addMacro = function(macro)
{
    var old = this.macros[macro.name];

    if (old !== undefined)
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
            if (old.isFunction === true)
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
            if (same === true)
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

        if (same === false)
        {
            var parser = this.parser;

            issueHandler.addWarning(
                parser.objj.issues,
                parser.input,
                parser.objj.file,
                new acorn.SourceLocation(
                    parser,
                    macro.start,
                    macro.start + macro.name.length
                ),
                "'" + macro.name + "' macro redefined"
            );
        }
    }

    this.macros[macro.name] = macro;
};

/**
 * Find a macro with the given name.
 *
 * @param {string} name
 * @returns {Macro|undefined}
 */
Preprocessor.prototype.getMacro = function(name)
{
    return this.macros[name];
};

/**
 * Look up the macro with the given name and return it. If the macro is self-referential ,
 * undefined is returned.
 *
 * @param {Macro} macro - The current macro.
 * @param {PreprocessorToken} token - The token that might be a macro name.
 * @param {boolean} [firstPass] - true if this lookup is occurring during the first pass of macro expansion.
 * @returns {Macro|undefined}
 */
Preprocessor.prototype.lookupMacro = function(macro, token, firstPass)
{
    // If the token has already been determined to be self-referential, don't expand it.
    if (firstPass !== true && token.selfReferential === true)
        return undefined;

    var theMacro = this.getMacro(token.value);

    if (theMacro !== undefined && firstPass !== true)
    {
        if (theMacro === macro)
        {
            token.selfReferential = true;

            return undefined;
        }

        if (this.isCircularMacroReference(theMacro) === true)
            return undefined;
    }

    return theMacro;
};

/**
 * Check to see if a macro reference in a macro body is circular.
 *
 * @param {Macro} macro
 * @returns {boolean}
 */
Preprocessor.prototype.isCircularMacroReference = function(macro)
{
    // Start at the macro below the current one.
    for (var i = this.macroExpansionStack.length - 2; i >= 0; --i)
    {
        var expansion = this.macroExpansionStack[i];

        if (expansion.macro === macro && expansion.type <= MacroExpansionType.body)
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
        if ((name in Preprocessor.predefinedMacros) === false)
        {
            // noinspection JSUnfilteredForInLoop
            var macro = this.macros[name];

            // Convert the macro to a text definition in the form macro=body
            this.macroList.push(macro.declaration + "=" + macro.body);
        }
    }
};

/**
 * Push a macro call on the stack. This also does the following:
 *
 * - Pushes a macro expansion state.
 * - If the macro is nested, sets the stream/index to the context
 * and calls readFromStream().
 * - If the macro is not nested, clears macroTokens and resets streamIndex.
 *
 * @param {Macro} macro
 * @param {MacroCallContext} context
 */
Preprocessor.prototype.pushMacro = function(macro, context)
{
    var parser = this.parser,
        token = context ? context.stream[context.index] : parser,
        state = new MacroExpansionState(
            macro,
            context ? context.caller : null,
            context ? context.type : MacroExpansionType.call,
            token.input,
            token.start,
            token.end,
            this.stream,
            this.streamIndex
        );

    if (context !== undefined)
    {
        // If context is defined, it means this is a nested macro call.
        // In that case we want to read tokens from the caller's stream.
        this.stream = context.stream;
        this.streamIndex = context.index;
        this.readFromStream();
    }
    else
    {
        // If we are reading from source, clear macroTokens to receive a new expansion
        this.macroTokens.splice(0, this.macroTokens.length);
        this.streamIndex = 0;
    }

    this.macroExpansionStack.push(state);
};

/**
 * popMacro does the following:
 *
 * - Pops this expansion.
 * - Restore the previous stream/index.
 * - Sets the context's index to the index of the last token we read in its token stream.
 *
 * @param context
 */
Preprocessor.prototype.popMacro = function(context)
{
    var state = this.macroExpansionStack.pop();

    if (context !== undefined)
    {
        // Communicate to the macro caller the index of the last token we read
        // in its token stream.
        context.index = this.streamIndex - 1;

        // Restore the previous stream
        this.stream = state.stream;
        this.streamIndex = state.streamIndex;
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

    this.defineMacros(definitions, "<predefined>");
};

/*
    Defines a macro from an array of text definitions in one of two formats:

    macro
    macro=body

    In the first case, the macro is defined with the value 1.
    In the second case, it must pass the normal parsing rules for macros.

    This method is called when defining predefined and command line macros.
    source will be either <predefined> or <command line>.
*/
Preprocessor.prototype.defineMacros = function(definitions, source)
{
    var objj = this.parser.objj,
        file = objj.file;

    objj.file = source;

    for (var i = 0; i < definitions.length; ++i)
        this.defineMacro(definitions[i]);

    objj.file = file;
};

Preprocessor.prototype.defineMacro = function(definition)
{
    definition = definition.trim();

    var parser = this.parser,
        pos = definition.indexOf("=");

    if (pos === 0)
        parser.raise(0, "Invalid option-defined macro definition: '" + definition + "'");

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

    parser.objj_resetParser();

    // We definitely don't want allow-hash-bang
    parser.options.allowHashBang = false;

    // Construct a definition that objj_parseDefine can digest.
    parser.input = name + " " + body;
    parser.skipSpace();

    // Make sure the state is set up correctly
    this.state &= ~PreprocessorState.expandMacros;
    this.state |= PreprocessorState.directive;

    parser.objj_parseDefine();

    this.state = PreprocessorState.default;

    // It's safe to leave the parser in the current state because
    // objj_resetParser will be called again before the main source is parsed.
};

/**
 * Expands the given macro into expandedTokens.
 *
 * @param {Macro} macro
 * @param {PreprocessorToken[]} expandedTokens
 * @param {object} context - For nested macros, this contains info on the caller's context.
 * @returns {boolean} - Returns true if the macro was actually expanded. Function macros that
 * are used without an argument list are inserted as the name and not expanded.
 */
Preprocessor.prototype.expandMacro = function(macro, expandedTokens, context)
{
    var parser = this.parser,
        nested = !!context,
        oldExpandBit = this.state & PreprocessorState.expandMacros;

    // Turn off automatic macro expansion, it is done explicitly
    this.state &= ~PreprocessorState.expandMacros;

    this.pushMacro(macro, context);

    // Function macros are not expanded if they are not followed by '('
    var expand = true;

    if (macro.isFunction === true)
    {
        if (this.tokenSource === TokenSource.source)
        {
            parser.skipSpace();
            expand = parser.input.charAt(parser.pos) === "(";
        }
        else
        {
            // When we reach here, streamIndex points to the macro name.
            // We want to check the next token.
            var nextToken = this.stream[this.streamIndex + 1];

            expand = !!(nextToken && nextToken.type === tt.parenL);

            // If we are expanding, move streamIndex to the next token,
            // which is where it would be if we had just parsed the name.
            if (expand === true)
                ++this.streamIndex;
        }
    }

    if (expand === true)
    {
        // Now we can eat the macro name
        parser.next();

        var args = null;

        if (macro.isFunction === true)
            args = parser.objj_parseMacroArguments(macro);

        // We are now pointing at the token after the last one in the macro call.
        // If we are expanding from source, we need to push it onto the end of
        // the expanded tokens so that the parser will return to that point after
        // reading the macro tokens.
        var tokenAfterMacro;

        if (nested === false)
            tokenAfterMacro = new PreprocessorToken(this);

        this.expandMacroBody(macro, args, expandedTokens);

        if (nested === false)
            expandedTokens.push(tokenAfterMacro);
    }

    this.popMacro(context);

    // Turn automatic macro expansion on if it was on before
    this.state |= oldExpandBit;

    return expand;
};

Preprocessor.prototype.pushExpandedToken = function(token, expandedTokens)
{
    expandedTokens.push(this.setTokenExpansions(token));
};

Preprocessor.prototype.expandMacroArgument = function(macro, arg)
{
    // We store the expanded tokens on the arg so we don't expand
    // every time the arg is used.
    if (arg.expandedTokens === null)
    {
        arg.expandedTokens = [];

        for (var i = 0; i < arg.tokens.length; ++i)
        {
            var token = arg.tokens[i];

            if (token.type === tt.name && token.selfReferential !== true)
            {
                var nestedMacro = this.lookupMacro(macro, token, true);

                if (nestedMacro !== undefined)
                {
                    var context = {
                            caller: macro,
                            type: MacroExpansionType.arg,
                            stream: arg.tokens,
                            index: i
                        };

                    if (this.expandMacro(nestedMacro, arg.expandedTokens, context) === true)
                    {
                        i = context.index;
                        continue;
                    }
                }
            }

            arg.expandedTokens.push(this.setTokenExpansions(token));
        }
    }

    return arg.expandedTokens;
};

Preprocessor.prototype.expandVariadicParameters = function(macro, args, token, expandedTokens)
{
    // Variadic arg receives all of the args after the last declared
    // non-variadic parameter. If no variadic args are passed, and
    // the token is marked deletePreviousComma, delete the comma.
    if (args.length < macro.parameters.length && token.objj_deletePreviousComma === true)
        expandedTokens.pop();
    else
    {
        for (var i = macro.parameters.length - 1; i < args.length; ++i)
        {
            expandedTokens.pushArray(this.expandMacroArgument(macro, args[i]));

            if (i < args.length - 1)
            {
                expandedTokens.push(
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

Preprocessor.prototype.expandMacroBody = function(macro, args, expandedTokens)
{
    // Expansion requires two passes.
    // First pass: argument substitution/expansion and pasting/stringfication.
    // Second pass: expand macro calls in the body.
    var firstPassTokens = this.expandMacroFirstPass(macro, args);

    this.expandMacroSecondPass(macro, firstPassTokens, expandedTokens);
};

Preprocessor.prototype.expandMacroFirstPass = function(macro, args)
{
    var expandedTokens = [];

    for (var i = 0; i < macro.tokens.length; ++i)
    {
        var token = macro.tokens[i],
            nextToken = macro.tokens[i + 1];

        // First handle pasting, because pasted args are not macro expanded.
        // If the next token is ##, do the paste thing. We don't have to check
        // if there is a token after ##, because that was done during macro parsing.

        if (nextToken !== undefined && nextToken.type === tt.objj_preTokenPaste)
        {
            i = this.pasteTokenSeries(macro, args, i, expandedTokens);
            continue;
        }

        if (macro.expandArgs === true && this.isMacroParameter(token) === true)
        {
            this.macroExpansionStack.push(new MacroExpansionState(
                macro,
                null,
                MacroExpansionType.body,
                macro.input,
                token.start,
                token.end,
                this.stream,
                this.streamIndex
            ));

            var argTokens = [];

            if (token.type === tt.name)
            {
                if (token.macroParameter.variadic === true)
                    this.expandVariadicParameters(macro, args, token, expandedTokens);
                else
                    argTokens = this.expandMacroArgument(macro, args[token.macroParameter.index]);
            }
            else // tt.objj_stringifiedName
            {
                argTokens = [this.stringifyMacroArgument(macro, args[token.macroParameter.index])];
            }

            expandedTokens.pushArray(argTokens);
            this.macroExpansionStack.pop();
        }
        else
            this.pushExpandedToken(token, expandedTokens);
    }

    return expandedTokens;
};

Preprocessor.prototype.expandMacroSecondPass = function(macro, bodyTokens, expandedTokens)
{
    for (var i = 0; i < bodyTokens.length; ++i)
    {
        var token = bodyTokens[i];

        if (token.type === tt.name)
        {
            var nestedMacro = this.lookupMacro(macro, token);

            if (nestedMacro !== undefined)
            {
                var context = {
                        caller: macro,
                        type: MacroExpansionType.body,
                        stream: bodyTokens,
                        index: i
                    };

                if (this.expandMacro(nestedMacro, expandedTokens, context) === true)
                {
                    i = context.index;
                    continue;
                }
            }
        }

        // The expansion has already been set for the token by the first pass
        expandedTokens.push(token);
    }
};

/**
 * Paste a series of: token (## token)+
 *
 * @param {Macro} macro - The macro being expanded.
 * @param args {object[]} - The arguments passed to the macro.
 * @param index {number} - Index of the first token to be pasted within args.
 * @param expandedTokens {object[]} - Result of paste is appended to this array.
 * @returns {number} - The index of the last token that we expanded/stringified.
 */
Preprocessor.prototype.pasteTokenSeries = function(macro, args, index, expandedTokens)
{
    /*
        When we get here, we know that we have: token (## token)+
        Paste a pair of tokens, then continue doing so until the
        next token is not ##.
    */
    var pastedTokens = [];

    do
    {
        // If tokens were pasted on the previous time through the loop, pop the last token
        // from the paste as the left token for the next paste. We pop it because the next
        // paste will replace that token.
        var leftToken = pastedTokens.length > 0 ? pastedTokens.pop() : macro.tokens[index],
            rightToken = macro.tokens[index + 2];

        index = this.pasteTokens(macro, args, leftToken, rightToken, index, pastedTokens);
    }
    while (index < macro.tokens.length - 1 && macro.tokens[index + 1].type === tt.objj_preTokenPaste);

    Array.prototype.push.apply(expandedTokens, pastedTokens);

    return index;
};

Preprocessor.prototype.pasteTokens = function(macro, args, leftToken, rightToken, index, expandedTokens)
{
    /*
        When we get here, we know that we have: token ## token
        We make two passes:

        1. Do argument substitution and stringification.
        2. Paste tokens immediately adjacent to ##.

        Return the index of the last token that we expanded/stringified.
    */
    var lastIndex = index,
        tokensToPaste = [],
        bodyToken = macro.tokens[index];

    this.macroExpansionStack.push(new MacroExpansionState(
        macro,
        null,
        MacroExpansionType.pasting,
        bodyToken.input,
        bodyToken.start,
        bodyToken.end,
        this.stream,
        this.streamIndex
    ));

    this.expandPasteToken(macro, args, leftToken, tokensToPaste);

    // Move to the ## and add it
    ++lastIndex;
    tokensToPaste.push(macro.tokens[lastIndex]);

    // Move to the token following ## and expand it
    ++lastIndex;
    this.expandPasteToken(macro, args, rightToken, tokensToPaste);

    /*
        Second pass. Go through the expanded tokens, pasting any
        tokens separated by ##. The rest are added as is.
    */
    for (var i = 0, lastPasteIndex = tokensToPaste.length - 1;
         i < tokensToPaste.length;
         ++i)
    {
        // Is the next token ##? If so, paste the current token and the one after ##.
        // A null token before or after ## means it was a macro parameter whose argument was empty,
        // and in that case we don't paste.
        if (i < lastPasteIndex && tokensToPaste[i + 1].type === tt.objj_preTokenPaste)
        {
            this.parsePastedTokens(macro, tokensToPaste, i, expandedTokens);

            // Move to the right token
            i += 2;
        }
        else
            this.pushExpandedToken(tokensToPaste[i], expandedTokens);
    }

    this.macroExpansionStack.pop();

    return lastIndex;
};

Preprocessor.prototype.expandPasteToken = function(macro, args, token, expandedTokens)
{
    if (this.isMacroParameter(token) === true)
    {
        var arg = args[token.macroParameter.index];

        if (arg.tokens.length !== 0)
        {
            // When pasting, arguments are *not* expanded, but they can be stringified
            if (token.type === tt.name)
                expandedTokens.pushArray(arg.tokens);
            else // type === _stringifiedName
                expandedTokens.push(this.stringifyMacroArgument(macro, arg));
        }
        else
            expandedTokens.push(null); // indicate that this was an empty arg
    }
    else
        expandedTokens.push(token);
};

Preprocessor.prototype.parsePastedTokens = function(macro, tokens, index, expandedTokens)
{
    var leftToken = tokens[index],
        pasteToken = tokens[index + 1],
        rightToken = tokens[index + 2],
        tokenText = leftToken === null ? "" : leftToken.input.substring(leftToken.start, leftToken.end);

    this.macroExpansionStack.push(new MacroExpansionState(
        macro,
        null,
        MacroExpansionType.synthesizedToken,
        macro.input,
        pasteToken.start,
        pasteToken.end,
        this.stream,
        this.streamIndex
    ));

    // Paste its text if it wasn't an empty arg
    if (rightToken !== null)
        tokenText += rightToken.input.substring(rightToken.start, rightToken.end);

    if (tokenText.length === 0)
        return;

    var parser = this.parser,
        parsedToken = null;

    try
    {
        // We don't want preprocessor active during lexing of paste tokens
        parser.objj.options.preprocessor = false;

        var tokenizer = acorn.tokenizer(tokenText, parser.options);

        parsedToken = tokenizer.getToken();

        // If tokEnd did not reach the end of the text,
        // the entire text was not a single token and thus is invalid.
        if (parsedToken !== null && parsedToken.end < tokenText.length)
            parsedToken = null;
        else
            parsedToken = new PreprocessorToken(this, tokenizer);
    }
    catch (ex)
    {
        // Nothing to do, null token is what we want
    }

    parser.objj.options.preprocessor = true;

    if (parsedToken === null)
    {
        // istanbul ignore else
        if (leftToken !== null)
            expandedTokens.push(this.setTokenExpansions(leftToken));

        // istanbul ignore else
        if (rightToken !== null)
            expandedTokens.push(this.setTokenExpansions(rightToken));

        this.captureMacroExpansion(format("pasting formed '%s', an invalid token", tokenText));
    }
    else
    {
        // If the token was valid, point the source file to scratch,
        // and modify the top of the expansion stack to point to the token
        // instead of the paste.
        var state = this.macroExpansionStack.last();

        state.input = parsedToken.input;
        state.start = parsedToken.start;
        state.end = parsedToken.end;
        parsedToken.sourceFile = "<scratch space>";

        expandedTokens.push(this.setTokenExpansions(parsedToken));
    }

    this.macroExpansionStack.pop();
};

Preprocessor.prototype.stringifyMacroArgument = function(macro, arg)
{
    if (arg.stringifiedTokens === undefined)
        arg.stringifiedTokens = this.stringifyTokens(macro, arg.tokens);

    return arg.stringifiedTokens;
};

Preprocessor.prototype.setTokenExpansions = function(token)
{
    // token.expansions = this.macroExpansionStack.slice();

    return token;
};

Preprocessor.prototype.isMacroParameter = function(token)
{
    return (token.type === tt.name || token.type === tt.objj_stringifiedName) && token.macroParameter !== undefined;
};

/**
 * Convert an array of tokens into stringified text.
 *
 * @param {Macro} macro
 * @param {PreprocessorToken[]} tokens
 * @returns {PreprocessorToken}
 */
Preprocessor.prototype.stringifyTokens = function(macro, tokens)
{
    var result = "\"",
        lastTokStart = this.parser.lastTokStart,
        lastTokEnd = this.parser.lastTokEnd;

    if (tokens.length > 0)
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

            if (match !== null)
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

                // istanbul ignore next: this theoretically can should never happen, but let's be defensive
                if (match === null)
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

    // Push an expansion context for the stringified token
    this.macroExpansionStack.push(new MacroExpansionState(
        macro,
        null,
        MacroExpansionType.synthesizedToken,
        result,
        0,
        result.length,
        this.stream,
        this.streamIndex
    ));

    // Construct a new string token
    var token = new PreprocessorToken(this);

    token.sourceFile = "<scratch space>";
    token.input = result;
    token.type = tt.string;
    token.value = result.slice(1, -1);
    token.raw = result;

    token.start = 0;
    token.end = token.pos = result.length;
    token.lastTokStart = lastTokStart;
    token.lastTokEnd = lastTokEnd;

    this.setTokenExpansions(token);
    this.macroExpansionStack.pop();

    return token;
};

Preprocessor.prototype.readFromSource = function()
{
    // istanbul ignore next: doesn't happen currently, but might in the future
    if (this.tokenSource === TokenSource.source)
        return;

    this.tokenSource = TokenSource.source;

    var parser = this.parser,
        next = acorn.Parser.prototype.objj_callNext.bind(parser);

    this.nextToken = next;
    this.readTmplToken = next;
    acorn.tokContexts.objj_import.override = acorn.Parser.prototype.objj_readImportFilenameToken.bind(parser);
};

Preprocessor.prototype.readFromStream = function()
{
    if (this.tokenSource === TokenSource.stream)
        return;

    this.tokenSource = TokenSource.stream;

    // When called, `this` is the Parser, so bind to the Preprocessor
    this.nextToken = this.streamNextToken.bind(this);
    this.readTmplToken = this.nextToken;
    acorn.tokContexts.objj_import.override = this.nextToken;
};

Preprocessor.prototype.parse = function(next)
{
    // Save the parser state
    var parser = this.parser,
        token = new PreprocessorToken(this);

    parser.skipSpace();
    this.addPredefinedMacros();
    this.defineMacros(parser.objj.options.macros || /* istanbul ignore next */ [], "<command line>");

    // Restore the parser state
    parser.objj_setToken(token);

    var result = next.call(parser);

    if (this.macroList !== undefined)
        this.getMacroList();

    return result;
};

Preprocessor.prototype.streamNextToken = function()
{
    var parser = this.parser;

    // istanbul ignore else: doesn't happen currently, but keep it for safety
    if (this.streamIndex < this.stream.length)
    {
        var token = this.stream[this.streamIndex++];

        parser.objj_setToken(token);

        /*
            If we are replaying macro tokens, there is extra housecleaning to do:

            - If this is the next to last token, it's the last token
            in the actual macro, and we need to record its end location.

            - If the macro token stream has been exhausted, go back to reading
            from source.
        */

        if (this.stream === this.macroTokens)
        {
            if (this.streamIndex === this.stream.length - 1)
            {
                this.isLastMacroToken = true;
                this.lastMacroTokenEnd = parser.end;
                this.lastMacroTokenEndLoc = parser.endLoc;
            }
            else if (this.streamIndex === this.stream.length)
            {
                this.readFromSource();

                // If we have exhausted the token stream, clear it
                this.stream.splice(0, this.stream.length);
            }
        }
    }
    else
        parser.finishToken(tt.eof);
};

// istanbul ignore next: don't worry about this for now
Preprocessor.prototype.captureMacroExpansion = function(errorMessage)
{
    var first = true,
        stackLength = this.macroExpansionStack.length;

    for (var i = 0; i < stackLength; ++i)
    {
        var state = this.macroExpansionStack[i],
            adder,
            message;

        // Skip pasting type, that will be followed by a pastedToken type
        // which we want to capture.
        if (state.type === MacroExpansionType.pasting)
            continue;

        if (first === true)
        {
            // If the next item on the stack is a call to an argument
            // of this macro, skip this item.
            if (i < stackLength - 1)
            {
                var nextState = this.macroExpansionStack[i + 1];

                if (nextState.type === MacroExpansionType.args && nextState.caller === state.macro)
                    continue;
            }

            adder = issueHandler.addError;
            message = errorMessage;
            first = false;
        }
        else
        {
            adder = issueHandler.addNote;
            message = format("expanded from macro '%s'", (state.caller || state.macro).name);
        }

        adder(
            this.parser.objj.issues,
            state.input,
            state.macro.file,
            state.start,
            message
        );
    }
};

// istanbul ignore next: don't worry about this for now
Preprocessor.prototype.captureTokenExpansion = function(ex)
{
    var parser = this.parser,
        issues = parser.objj.issues,
        parserFile = this.parser.objj.file;

    // If there are still macro tokens left to be expanded,
    // replay the path that got us here.
    if (this.macroTokens.length > 0)
    {
        // The current token is streamIndex - 1, because streamIndex
        // points to the *next* token to be fetched from the stream.
        var token = this.stream[this.streamIndex - 1],
            first = true,
            error;

        for (var i = 0; i < token.expansions.length; ++i)
        {
            var expansion = token.expansions[i];

            if (first === true)
            {
                error = issueHandler.addError(
                    issues,
                    expansion.input,
                    expansion.macro.file || parserFile,
                    expansion,
                    issueHandler.stripLocation(ex.message)
                );

                first = false;
            }
            else
            {
                var input,
                    file;

                if (i === token.expansions.length - 1 && token.sourceFile === "<scratch space>")
                {
                    input = token.input;
                    file = token.sourceFile || parserFile;
                }
                else
                {
                    input = expansion.input;
                    file = expansion.macro.file;
                }

                issueHandler.addNote(
                    issues,
                    input,
                    file,
                    expansion,
                    "expanded from %s",
                    file === "<scratch space>" ? "here" : "macro '" + (expansion.caller || expansion.macro).name + "'"
                );
            }
        }

        throw error;
    }
    else
        throw issueHandler.addAcornError(issues, ex, parser.input, parserFile);
};

exports.Preprocessor = Preprocessor;

require("./pre-token-types.js");

var tokenize = require("./pre-tokenize.js");

require("./pre-parser.js");
require("./pre-statements.js");
require("./pre-expressions.js");

var PreprocessorToken = tokenize.PreprocessorToken;

module.exports.init = function(parser)
{
    // pre-tokenize.js overrides readWord that tokenize.js also overrides.
    // So we have to explicitly define the override at runtime.
    tokenize.init();

    var pp = acorn.Parser.prototype;

    utils.extendParser(parser, "skipSpace", pp.objj_skipSpace);
    utils.extendParser(parser, "nextToken", pp.objj_nextToken);
    utils.extendParser(parser, "readTmplToken", pp.objj_readTmplToken);
    utils.extendParser(parser, "readWord", pp.objj_readWord);
    utils.extendParser(parser, "finishNode", pp.objj_finishNode);
    utils.extendParser(parser, "parseTopLevel", pp.objj_parseTopLevel);

    var pre = parser.objj.preprocessor = new Preprocessor(parser);

    utils.extendParser(parser, "parse", pre.parse.bind(pre));
};
