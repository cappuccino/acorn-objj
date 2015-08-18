"use strict";

var issueHandler = require("acorn-issue-handler"),
    utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var makeParser = utils.makeParser;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Warnings & Errors", function()
{
    it("Command line macro definition with missing name is an error", function()
    {
        makeParser("x = foo;\n", { objjOptions: { macros: ["=1"] }})
            .should.throw(SyntaxError, /^Invalid option-defined macro definition:/);
    });

    it("Invalid # directive is an error", function()
    {
        makeParser("#foo\n")
            .should.throw(SyntaxError, /^Invalid preprocessing directive/);
    });

    it("# must be the first token on a line", function()
    {
        makeParser("x #define FOO\n")
            .should.throw(SyntaxError, /^# must be the first non-whitespace character on a line/);
    });

    it("#define without a macro name is an error", function()
    {
        makeParser("#define\n")
            .should.throw(SyntaxError, /^Macro name missing/);
    });

    it("#undef without a macro name is an error", function()
    {
        makeParser("#undef\n")
            .should.throw(SyntaxError, /^Macro name missing/);
    });

    it("Redefining a macro is a warning", function()
    {
        var issues = [];

        makeParser("#define __NODE__\n", null, issues)();
        issues.length.should.equal(1);
        issues[0].message.should.equal("'__NODE__' macro redefined");
    });

    it("Using __VA_ARGS__ as a macro name is an error", function()
    {
        makeParser("#define __VA_ARGS__\n")
            .should.throw(SyntaxError, /^__VA_ARGS__ may only be used within the body of a variadic macro/);
    });

    it("Using 'defined' as a macro name is an error", function()
    {
        makeParser("#define defined\n")
            .should.throw(SyntaxError, /^'defined' may not be used as a macro name/);
    });

    it("Missing , between macro arguments is an error", function()
    {
        makeParser("#define foo(a b)\n")
            .should.throw(SyntaxError, /^Expected ',' between macro parameters/);
    });

    it("Using __VA_ARGS__ as a macro argument name is an error", function()
    {
        makeParser("#define foo(__VA_ARGS__)\n")
            .should.throw(SyntaxError, /^__VA_ARGS__ may only be used within the body of a variadic macro/);
    });

    it("Using a macro argument name more than once is an error", function()
    {
        makeParser("#define foo(bar, bar)\n")
            .should.throw(SyntaxError, /^Duplicate macro parameter name 'bar'/);
    });

    it("Specifying macro arguments after ... is an error", function()
    {
        makeParser("#define foo(bar, ..., baz)\n")
            .should.throw(SyntaxError, /^Expected '\)' after \.\.\. in macro parameter list/);
    });

    it("Invalid token in a macro argument is an error", function()
    {
        makeParser("#define foo(bar, +)\n")
            .should.throw(SyntaxError, /^Invalid token in macro parameter list/);
    });

    it("'\\' not followed by EOL in a macro definition is an error", function()
    {
        makeParser("#define foo \\ bar\n")
            .should.throw(SyntaxError, /^Expected EOL after '\\'/);
    });

    it("stringify not followed by a name is an error", function()
    {
        makeParser("#define foo(arg) #7\n")
            .should.throw(SyntaxError, /^# \(stringify\) must be followed by a name/);
    });

    it("Using __VA_ARGS__ in a macro body when there are named variadic parameters is an error", function()
    {
        makeParser("#define foo(args...) __VA_ARGS__\n")
            .should.throw(SyntaxError, /^__VA_ARGS__ may not be used when there are named variadic parameters/);
    });

    it("Using __VA_ARGS__ in a macro body when there no variadic parameters is an error", function()
    {
        makeParser("#define foo(args) __VA_ARGS__\n")
            .should.throw(SyntaxError, /^__VA_ARGS__ may only be used within the body of a variadic macro/);
    });

    it("## at the beginning of a macro expansion is an error", function()
    {
        makeParser("#define foo(arg) ## arg\n")
            .should.throw(SyntaxError, /^'##' cannot be at the beginning of a macro expansion/);
    });

    it("## at the end of a macro expansion is an error", function()
    {
        makeParser("#define foo(arg) arg ##\n")
            .should.throw(SyntaxError, /^'##' cannot be at the end of a macro expansion/);
    });

    it("Concatenation that forms an invalid token is a warning", function()
    {
        var issues = [];

        makeParser("#define paste(arg1, arg2) arg1 ## arg2\npaste(\"paste\", + \"me\")\n", null, issues)();
        issues.length.should.equal(1);
        issues[0].should.be.an.instanceof(issueHandler.Warning);
        issues[0].message.should.equal("pasting formed '\"paste\"+', an invalid token");
    });

    it("Reaching EOF before a macro call is complete is an error", function()
    {
        makeParser("#define foo(arg) arg\nfoo('bar'")
            .should.throw(SyntaxError, /^Unexpected EOF in macro call/);
    });

    it("Calling a macro with a wrong argument count is an error", function()
    {
        makeParser("#define foo(arg1, arg2) arg1 + arg2\nfoo(7)")
            .should.throw(SyntaxError, /^Macro defines 2 parameters, called with 1 argument/);
    });

    it("#if without balancing #endif at EOF is an error", function()
    {
        makeParser("#if 7\n")
            .should.throw(SyntaxError, /^Unterminated #if at EOF/);
    });

    it("#ifdef without balancing #endif at EOF is an error", function()
    {
        makeParser("#ifdef FOO\n")
            .should.throw(SyntaxError, /^Unterminated #ifdef at EOF/);
    });

    it("#else without balancing #if is an error", function()
    {
        makeParser("#else\n")
            .should.throw(SyntaxError, /^#else without matching #if/);
    });

    it("Nested #else without matching #if is an error", function()
    {
        var issues = [];

        makeParser("#if FOO\n#else\n#else\n", null, issues)
            .should.throw(issueHandler.AbortError);

        issues.length.should.equal(2);

        issues[0].should.be.an.instanceof(issueHandler.Error);
        issues[0].message.should.equal("expected #endif, saw #else");

        issues[1].should.be.an.instanceof(issueHandler.Note);
        issues[1].message.should.equal("matching #if is here:");
    });

    it("#elif without matching #if is an error", function()
    {
        makeParser("#elif FOO\n")
            .should.throw(SyntaxError, /^#elif without matching #if/);
    });

    it("Nested #elif without matching #if is an error", function()
    {
        var issues = [];

        makeParser("#if FOO\n#else\n#elif BAR\n", null, issues)
            .should.throw(issueHandler.AbortError);

        issues.length.should.equal(2);

        issues[0].should.be.an.instanceof(issueHandler.Error);
        issues[0].message.should.equal("expected #endif, saw #elif");

        issues[1].should.be.an.instanceof(issueHandler.Note);
        issues[1].message.should.equal("matching #if is here:");
    });

    it("#endif without matching #if is an error", function()
    {
        makeParser("#endif\n")
            .should.throw(SyntaxError, /^#endif without matching #if/);
    });

    it("#ifdef without a name is an error", function()
    {
        makeParser("#ifdef\n")
            .should.throw(SyntaxError, /^Missing name after #ifdef/);
    });

    it("#ifndef without a name is an error", function()
    {
        makeParser("#ifndef\n")
            .should.throw(SyntaxError, /^Missing name after #ifndef/);
    });

    it("#ifdef expression not terminated by EOL is an error", function()
    {
        makeParser("#ifdef FOO BAR\n")
            .should.throw(SyntaxError, /^#ifdef expressions must be followed by EOL/);
    });

    it("#ifndef expression not terminated by EOL is an error", function()
    {
        makeParser("#ifndef FOO BAR\n")
            .should.throw(SyntaxError, /^#ifndef expressions must be followed by EOL/);
    });

    it("#else not followed by EOL is an error", function()
    {
        makeParser("#if FOO\n#else BAR\n#endif\n")
            .should.throw(SyntaxError, /^#else must be followed by EOL/);
    });

    it("#endif not followed by EOL is an error", function()
    {
        makeParser("#if FOO\n#endif BAR\n")
            .should.throw(SyntaxError, /^#endif must be followed by EOL/);
    });

    it("Floating point literal in a preprocessor expression is an error", function()
    {
        makeParser("#if 7.27\n#endif\n")
            .should.throw(SyntaxError, /^Non-integer number in preprocesor expression/);
    });

    it("Scientific literal in a preprocessor expression is an error", function()
    {
        makeParser("#if 7e13\n#endif\n")
            .should.throw(SyntaxError, /^Non-integer number in preprocesor expression/);
    });

    it("Invalid #if expression operator is an error", function()
    {
        makeParser("#if 1 = 1\n#endif\n")
            .should.throw(SyntaxError, /^Token is not a valid binary operator in a preprocessor subexpression/);
    });

    it("Invalid #elif expression operator is an error", function()
    {
        makeParser("#if 0\n#elif 1 = 1\n#endif\n")
            .should.throw(SyntaxError, /^Token is not a valid binary operator in a preprocessor subexpression/);
    });

    it("Unclosed parenthetical expression is an error", function()
    {
        makeParser("#if (27\n#endif\n")
            .should.throw(SyntaxError, /^Expected '\)' in preprocessor expression/);
    });

    it("Invalid expression token is an error", function()
    {
        makeParser("#if [foo]\n#endif\n")
            .should.throw(SyntaxError, /^Invalid preprocessor expression token/);
    });

    it("'defined' without a name is an error", function()
    {
        makeParser("#if defined\n#endif\n")
            .should.throw(SyntaxError, /^Macro name missing/);
    });

    it("'defined()' without a closing parens is an error", function()
    {
        makeParser("#if defined(foo\n#endif\n")
            .should.throw(SyntaxError, /^Missing '\)' after macro name/);
    });

    it("#warning not followed by a string is an error", function()
    {
        makeParser("#warning 7\n")
            .should.throw(SyntaxError, /^#warning must be followed by a string/);
    });

    it("#error not followed by a string is an error", function()
    {
        makeParser("#error 7\n")
            .should.throw(SyntaxError, /^#error must be followed by a string/);
    });

    it("#warning message not followed by EOL is an error", function()
    {
        makeParser("#warning \"hello\" 7\n")
            .should.throw(SyntaxError, /^#warning message must be followed by EOL/);
    });

    it("#error message not followed by EOL is an error", function()
    {
        makeParser("#error \"hello\" 7\n")
            .should.throw(SyntaxError, /^#error message must be followed by EOL/);
    });
});
