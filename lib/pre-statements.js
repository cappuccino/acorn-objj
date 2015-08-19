"use strict";

var acorn = require("acorn"),
    issueHandler = require("acorn-issue-handler"),
    Macro = require("./pre-macro.js"),
    Preprocessor = require("./preprocessor.js"),
    PreprocessorToken = require("./pre-tokenize.js").PreprocessorToken;

// jscs: disable requireMultipleVarDecl

var tt = acorn.tokTypes;

// jscs: enable

acorn.Parser.prototype.objj_parseTopLevel = function(next, node)
{
    node = next.call(this, node);

    // If we are EOF at this point and something is left on the if stack, it was unterminated.
    var stack = this.objj.preprocessor.ifStack;

    if (this.type === tt.eof && stack.length > 0)
        this.raise(stack[0].pos, "Unterminated " + stack[0].type.label + " at EOF");

    return node;
};

acorn.Parser.prototype.objj_parsePreprocess = function()
{
    // By default, macro expansion is off when processing preprocessor directives
    var node = this.startNode(),
        pp = this.objj.preprocessor;

    pp.state &= ~Preprocessor.state.expandMacros;
    pp.state |= Preprocessor.state.directive;
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

                this.objj_expect(tt.name, "Macro name missing");
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
            this.objj_skipToEOL(true);
            break;

        case tt._objj_pre_error:
        case tt._objj_pre_warning:
            if (pp.skipping)
                this.objj_skipToEOL();
            else
                this.objj_parsePreDiagnostic(directive);
            break;

        default:
            this.raise(this.start, "Invalid preprocessing directive '" + this.value + "'");
    }

    pp.state = Preprocessor.state.default;

    // Eat the EOL that should terminate every directive. We have to wait until this point
    // to do it so that the preprocessor state will allow a directive on the next line to be recognized.
    this.next();

    if (pp.skipping)
        this.objj_skipToNextPreDirective();

    // We return a placeholder node to avoid having to override acorn.Parser.parseTopLevel
    return this.finishNode(node, "objj_PreprocessorStatement");
};

acorn.Parser.prototype.objj_parseMacroParameters = function(info, parameters, parameterMap)
{
    // Read macro parameters
    this.eat(tt.parenL);
    info.isFunction = true;

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
                        this.raise(this.start, "Duplicate macro parameter name '" + argName + "'");

                    this.next();

                    // If a name is followed by ..., it means the variadic args are named
                    if (this.type === tt.ellipsis)
                    {
                        info.variadicParameterName = argName;
                        continue;
                    }
                    else
                    {
                        parameter = {
                            name: argName,
                            variadic: false
                        };

                        parameters.push(parameter);
                        parameterMap[parameter.name] = parameter;
                        expectComma = true;
                        break;
                    }

                case tt.ellipsis:
                    info.isVariadic = true;
                    parameter = {
                        name: info.variadicParameterName,
                        variadic: true
                    };
                    parameters.push(parameter);
                    parameterMap[parameter.name] = parameter;
                    this.next();

                    if (this.type !== tt.parenR)
                        this.raise(this.start, "Expected ')' after ... in macro parameter list");

                    break scanParameters;

                default:
                    this.raise(this.start, "Invalid token in macro parameter list");
            }
        }
    }

    this.next();
};

acorn.Parser.prototype.objj_readMacroBodyTokens = function(parameters, parameterMap, tokens, isVariadic, variadicParameterName)
{
    // Read macro body tokens until eof or eol that is not preceded by '\'
    while (this.type !== tt.objj_eol && this.type !== tt.eof)
    {
        var token = new PreprocessorToken(this.objj.preprocessor);

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
                        break;
                    }
                }
                else if (this.value === "__VA_ARGS__")
                    this.raise(this.start, "__VA_ARGS__ may only be used within the body of a variadic macro");

                // If it's a stringified name, make sure the name is a valid macro parameter
                if (this.type === tt.objj_stringifiedName && !(this.value in parameterMap))
                    this.raise(this.start, "# is not followed by a macro parameter");

                break;

            default:
                break;
        }

        tokens.push(token);
        this.next();
    }
};

acorn.Parser.prototype.objj_parseDefine = function()
{
    this.next();

    var declarationStart = this.start,
        declarationEnd = this.end,
        name = this.value;

    this.objj_expect(tt.name, "Macro name missing");

    if (name === "__VA_ARGS__")
        this.raise(declarationStart, "__VA_ARGS__ may only be used within the body of a variadic macro");
    else if (name === "defined")
        this.raise(declarationStart, "'defined' may not be used as a macro name");

    var parameters = [],
        parameterMap = Object.create(null), // Don't inherit from Object
        isFunction = false,
        isVariadic = false,
        variadicParameterName = "__VA_ARGS__",
        bodyStart = this.start,
        bodyEnd;

    // '(' Must follow directly after identifier to be a valid macro with parameters
    if (this.input.charCodeAt(declarationEnd) === 40) // '('
    {
        var info = {
            isFunction: isFunction,
            variadicParameterName: variadicParameterName,
            isVariadic: isVariadic
        };

        this.objj_parseMacroParameters(info, parameters, parameterMap);

        isFunction = info.isFunction;
        variadicParameterName = info.variadicParameterName;
        isVariadic = info.isVariadic;
        declarationEnd = this.lastTokEnd;
        bodyStart = this.start;
    }

    var tokens = [];

    this.objj_readMacroBodyTokens(parameters, parameterMap, tokens, isVariadic, variadicParameterName);

    // ## cannot be at the beginning or end
    if (tokens.length > 0)
    {
        if (tokens[0].type === tt.objj_preTokenPaste)
            this.raise(tokens[0].start, "'##' cannot be at the beginning of a macro expansion");
        else if (tokens.last().type === tt.objj_preTokenPaste)
            this.raise(tokens.last().start, "'##' cannot be at the end of a macro expansion");
    }

    bodyEnd = this.lastTokEnd;

    var macro = new Macro(
                    name,
                    declarationStart,
                    this.input.substring(declarationStart, declarationEnd),
                    parameters,
                    parameterMap,
                    isFunction,
                    isVariadic,
                    this.input.substring(bodyStart, bodyEnd),
                    tokens
                );

    this.objj.preprocessor.addMacro(macro);
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

            case tt.eof:
                return this.raise(this.lastTokEnd, "Unexpected EOF in macro call");

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

acorn.Parser.prototype.objj_expectedPreEndif = function(start, end, ifState, saw)
{
    issueHandler.addError(
        this.objj.issues,
        this.input,
        this.objj.file,
        new acorn.SourceLocation(this, start, end),
        "Expected #endif, saw #" + saw
    );

    issueHandler.addNote(
        this.objj.issues,
        ifState.input,
        this.objj.file,
        ifState.pos,
        "Matching %s is here:",
        ifState.type.label
    );

    throw new issueHandler.AbortError();
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
            this.raise(startPos, "#elif without matching #if");

        state = pp.ifStack.last();

        if (state.phase === Preprocessor.ifState.afterElse)
            this.objj_expectedPreEndif(this.start, this.end, state, "elif");

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
            phase: Preprocessor.ifState.afterIf,
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
    else // (type === tt._objj_pre_ifdef || type === tt._objj_pre_ifndef)
    {
        this.next();

        if (this.type !== tt.name)
            this.raise(this.start, "Missing name after " + type.label);

        value = pp.isMacro(this.value);

        if (type === tt._objj_pre_ifndef)
            value = !value;

        this.next();
    }

    if (this.type !== tt.objj_eol)
        this.raise(this.start, type.label + " expressions must be followed by EOL");

    pp.skipping = state.skipping = !value;
};

acorn.Parser.prototype.objj_parsePreElse = function()
{
    var pp = this.objj.preprocessor;

    this.next();

    if (this.type !== tt.objj_eol)
        this.raise(this.lastTokStart, "#else must be followed by EOL");

    if (pp.ifStack.length > 0)
    {
        var state = pp.ifStack.last();

        if (state.phase === Preprocessor.ifState.afterElse)
            this.objj_expectedPreEndif(this.lastTokStart, this.lastTokEnd, state, "else");

        state.phase = Preprocessor.ifState.afterElse;
        pp.skipping = state.skipping = !state.skipping;
    }
    else
        this.raise(this.lastTokStart, "#else without matching #if");
};

acorn.Parser.prototype.objj_parsePreEndif = function()
{
    var pp = this.objj.preprocessor,
        startPos = this.start;

    this.next();

    if (this.type !== tt.objj_eol)
        this.raise(startPos, "#endif must be followed by EOL");

    if (pp.ifStack.length > 0)
    {
        pp.ifStack.pop();

        // If this ended a nested #if, we resume the skipping state
        // of the next #if up the stack.
        pp.skipping = pp.ifStack.length > 0 ? pp.ifStack.last().skipping : false;
    }
    else
        this.raise(startPos, "#endif without matching #if");
};

acorn.Parser.prototype.objj_parsePreDiagnostic = function(type)
{
    var start = this.start;

    this.next();

    if (this.type !== tt.string)
        this.raise(this.start, type.label + " must be followed by a string");

    var message = this.value;

    this.next();

    if (this.type !== tt.objj_eol)
        this.raise(this.start, type.label + " message must be followed by EOL");

    issueHandler.addIssue(
        type === tt._objj_pre_error ? issueHandler.Error : issueHandler.Warning,
        this.objj.issues,
        this.input,
        this.objj.file,
        new acorn.SourceLocation(this, start, start),
        message
    );
};
