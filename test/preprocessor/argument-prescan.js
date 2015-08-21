"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var dir = "3.10.6 Argument Prescan/",
    makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Argument prescan", function()
{
    it("if an argument is stringified or concatenated, prescan does not occur", function()
    {
        testFixture("preprocessor", dir + "afterx");
    });

    it("argument prescan can cause arguments to be multiplied", function()
    {
        makeParser("#define foo  a,b\n#define bar(x) lose(x)\n#define lose(x) (1 + (x))\nbar(foo);\n")
            .should.throw(SyntaxError, /^Macro defines 1 parameter, called with 2 arguments/);
    });

    it("argument prescan expansion can be solved with extra parens", function()
    {
        testFixture("preprocessor", dir + "foobar");
    });

    it("argument prescan allows nested calls to a macro", function()
    {
        testFixture("preprocessor", dir + "nested");
    });
});
