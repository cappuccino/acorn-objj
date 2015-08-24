"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var dir = "3.2 Function-like Macros/",
    makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Function-like macros", function()
{
    it("can be called like functions", function()
    {
        testFixture("preprocessor", dir + "called-like-functions");
    });

    it("should not be expanded if referenced without args", function()
    {
        testFixture("preprocessor", dir + "function-macros-without-args");
    });

    it("should not recognize parameter lists unless they directly follow the macro name", function()
    {
        testFixture("preprocessor", dir + "parameters-must-follow-name");
    });

    it("missing , between macro arguments is an error", function()
    {
        makeParser("#define foo(a b)\n")
            .should.throw(SyntaxError, /^Expected ',' between macro parameters/);
    });

    it("using __VA_ARGS__ as a macro argument name is an error", function()
    {
        makeParser("#define foo(__VA_ARGS__)\n")
            .should.throw(SyntaxError, /^__VA_ARGS__ may only be used within the body of a variadic macro/);
    });

    it("using a macro argument name more than once is an error", function()
    {
        makeParser("#define foo(bar, bar)\n")
            .should.throw(SyntaxError, /^Duplicate macro parameter name 'bar'/);
    });

    it("specifying macro arguments after ... is an error", function()
    {
        makeParser("#define foo(bar, ..., baz)\n")
            .should.throw(SyntaxError, /^Expected '\)' after \.\.\. in macro parameter list/);
    });

    it("invalid token in a macro argument is an error", function()
    {
        makeParser("#define foo(bar, +)\n")
            .should.throw(SyntaxError, /^Invalid token in macro parameter list/);
    });

    it("missing right parens at the end of a parameter list is an error", function()
    {
        makeParser("#define foo(bar\n")
            .should.throw(SyntaxError, /^Expected ',' between macro parameters/);
    });

    it("reaching EOF before a macro call is complete is an error", function()
    {
        makeParser("#define foo(arg) arg\nfoo('bar'")
            .should.throw(SyntaxError, /^Unexpected EOF in macro call/);
    });

    it("calling a macro with too few arguments is an error", function()
    {
        makeParser("#define foo(arg1, arg2) arg1 + arg2\nfoo(7)")
            .should.throw(SyntaxError, /^Macro defines 2 parameters, called with 1 argument/);
    });

    it("calling a macro with too many arguments is an error", function()
    {
        makeParser("#define foo(arg1) arg1\nfoo(7, 27, 31)")
            .should.throw(SyntaxError, /^Macro defines 1 parameter, called with 2 arguments/);
    });
});
