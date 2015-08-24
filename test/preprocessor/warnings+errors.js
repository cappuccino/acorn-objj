"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var makeParser = utils.makeParser;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Warnings & errors", function()
{
    it("command line macro definition with missing name is an error", function()
    {
        makeParser("x = foo;\n", { objjOptions: { macros: ["=1"] }})
            .should.throw(SyntaxError, /^Invalid option-defined macro definition:/);
    });

    it("invalid # directive is an error", function()
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

    it("redefining a macro with a different definition is a warning", function()
    {
        var issues = [];

        makeParser("#define foo\n#define foo 7\n", null, issues)();
        issues.length.should.equal(1);
        issues[0].message.should.equal("'foo' macro redefined");

        issues = [];
        makeParser("#define foo 7\n#define foo 13\n", null, issues)();
        issues.length.should.equal(1);
        issues[0].message.should.equal("'foo' macro redefined");

        issues = [];
        makeParser("#define foo 7\n#define foo 'bar'\n", null, issues)();
        issues.length.should.equal(1);
        issues[0].message.should.equal("'foo' macro redefined");

        issues = [];
        makeParser("#define foo() 7\n#define foo(arg) 7\n", null, issues)();
        issues.length.should.equal(1);
        issues[0].message.should.equal("'foo' macro redefined");

        issues = [];
        makeParser("#define foo(arg) 7\n#define foo(bar) 7\n", null, issues)();
        issues.length.should.equal(1);
        issues[0].message.should.equal("'foo' macro redefined");
    });

    it("using __VA_ARGS__ as a macro name is an error", function()
    {
        makeParser("#define __VA_ARGS__\n")
            .should.throw(SyntaxError, /^__VA_ARGS__ may only be used within the body of a variadic macro/);
    });

    it("using 'defined' as a macro name is an error", function()
    {
        makeParser("#define defined\n")
            .should.throw(SyntaxError, /^'defined' may not be used as a macro name/);
    });

    it("'\\' not followed by EOL in a macro definition is an error", function()
    {
        makeParser("#define foo \\ bar\n")
            .should.throw(SyntaxError, /^Expected EOL after '\\'/);
    });
});
