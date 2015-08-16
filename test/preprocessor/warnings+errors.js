"use strict";

var utils = require("../lib/test-utils");

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
        issues[0].message.should.equal("Warning: '__NODE__' macro redefined");
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
});
