"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var dir = "3.3 Macro Arguments/",
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Macro arguments", function()
{
    it("should be substituted within the macro body", function()
    {
        testFixture("preprocessor", dir + "arguments");
    });

    it("may contain commas", function()
    {
        testFixture("preprocessor", dir + "commas");
    });

    it("may be empty", function()
    {
        testFixture("preprocessor", dir + "empty");
    });

    it("should be macro-expanded before substitution", function()
    {
        testFixture("preprocessor", dir + "expanded");
    });

    it("should allow unbalanced square brackets", function()
    {
        testFixture("preprocessor", dir + "square-brackets");
    });

    it("should be substituted if they appear within a string literal", function()
    {
        testFixture("preprocessor", dir + "strings");
    });

    it("should be expanded after substitution", function()
    {
        testFixture("preprocessor", dir + "two-pass-expansion");
    });

    it("should trim leading/trailing whitespace and collapse whitespace between tokens", function()
    {
        testFixture("preprocessor", dir + "whitespace");
    });
});
