"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var dir = "3.5 Concatenation/",
    makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Concatenation", function()
{
    it("should work if a macro has no parameters", function()
    {
        testFixture("preprocessor", dir + "no-parameters");
    });

    it("should be ignored if an argument on either side of ## is empty", function()
    {
        testFixture("preprocessor", dir + "empty-arg");
    });

    it("should paste only tokens adjacent to ## after argument substitution/stringification", function()
    {
        testFixture("preprocessor", dir + "adjacent-tokens");
    });

    it("should not macro-expand arguments", function()
    {
        testFixture("preprocessor", dir + "no-expand-arg");
    });

    it("should stringify concatenated args", function()
    {
        testFixture("preprocessor", dir + "stringify");
    });

    it("## at the beginning of a macro expansion is an error", function()
    {
        makeParser("#define foo(arg) ## arg\n")
            .should.throw(SyntaxError, /'##' cannot be at the beginning of a macro expansion/);
    });

    it("## at the end of a macro expansion is an error", function()
    {
        makeParser("#define foo(arg) arg ##\n")
            .should.throw(SyntaxError, /'##' cannot be at the end of a macro expansion/);
    });

    it("concatenation that forms an invalid token is an error", function()
    {
        var issues = [],
            defines = "#define test(arg1, arg2) paste(arg1, arg2)\n" +
                      "#define paste(arg1, arg2) arg1 ## arg2\n",
            source = defines + "test(\"paste\", + \"me\")\n";

        makeParser(source, null, issues)();

        issues.length.should.equal(3);
        utils.testIssue(issues[0], "error", "pasting formed '\"paste\"+', an invalid token", "test(\"paste\", + \"me\")", 3, 0);
        utils.testIssue(issues[1], "note", "expanded from macro 'test'", "#define test(arg1, arg2) paste(arg1, arg2)", 1, 25);
        utils.testIssue(issues[2], "note", "expanded from macro 'paste'", "#define paste(arg1, arg2) arg1 ## arg2", 2, 31);

        source = defines + "test(\"paste\", paste(+, \"me\"))\n";
        issues = [];

        makeParser(source, null, issues)();

        issues.length.should.equal(5);
        utils.testIssue(issues[0], "error", "pasting formed '+\"me\"', an invalid token", "test(\"paste\", paste(+, \"me\"))", 3, 14);
        utils.testIssue(issues[1], "note", "expanded from macro 'paste'", "#define paste(arg1, arg2) arg1 ## arg2", 2, 31);
        utils.testIssue(issues[2], "error", "pasting formed '\"paste\"+', an invalid token", "test(\"paste\", paste(+, \"me\"))", 3, 0);
        utils.testIssue(issues[3], "note", "expanded from macro 'test'", "#define test(arg1, arg2) paste(arg1, arg2)", 1, 25);
        utils.testIssue(issues[4], "note", "expanded from macro 'paste'", "#define paste(arg1, arg2) arg1 ## arg2", 2, 31);
    });
});
