"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Macro arguments", function()
{
    it("should be substituted within the macro body", function()
    {
        testFixture("preprocessor", "3.3 Macro Arguments/arguments");
    });

    it("may contain commas", function()
    {
        testFixture("preprocessor", "3.3 Macro Arguments/commas");
    });

    it("may be empty", function()
    {
        testFixture("preprocessor", "3.3 Macro Arguments/empty");
    });

    it("should be macro-expanded before substitution", function()
    {
        testFixture("preprocessor", "3.3 Macro Arguments/expanded");
    });

    it("should allow unbalanced square brackets", function()
    {
        testFixture("preprocessor", "3.3 Macro Arguments/square-brackets");
    });

    it("should be substituted if they appear within a string literal", function()
    {
        testFixture("preprocessor", "3.3 Macro Arguments/strings");
    });

    it("should be expanded after substitution", function()
    {
        testFixture("preprocessor", "3.3 Macro Arguments/two-pass-expansion");
    });

    it("should trim leading/trailing whitespace and collapse whitespace between tokens", function()
    {
        testFixture("preprocessor", "3.3 Macro Arguments/whitespace");
    });
});
