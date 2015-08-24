"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var dir = "3.4 Stringification/",
    makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Stringification", function()
{
    it("should backslash-escape quotes and backslashes", function()
    {
        testFixture("preprocessor", dir + "backslash-escape");
    });

    it("should stringify the same arg multiple times if requested", function()
    {
        testFixture("preprocessor", dir + "multiple");
    });

    it("should create an empty string for empty arg", function()
    {
        testFixture("preprocessor", dir + "empty-arg");
    });

    it("requires an extra level of indirection to expand a macro arg", function()
    {
        testFixture("preprocessor", dir + "two-level");
    });

    it("should remove leading/trailing whitespace and collapse inner whitespace", function()
    {
        testFixture("preprocessor", dir + "whitespace");
    });

    it("stringify not followed by a name is an error", function()
    {
        makeParser("#define foo(arg) #7\n")
            .should.throw(SyntaxError, /^# \(stringify\) must be followed by a name/);
    });

    it("stringify followed by a name that is not a macro parameter is an error", function()
    {
        makeParser("#define foo(arg) #bar\n")
            .should.throw(SyntaxError, /^# is not followed by a macro parameter/);
    });
});
