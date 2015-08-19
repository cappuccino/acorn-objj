"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Stringification", function()
{
    it("should backslash-escape quotes and backslashes", function()
    {
        testFixture("preprocessor", "3.4 Stringification/backslash-escape");
    });

    it("should create an empty string for empty arg", function()
    {
        testFixture("preprocessor", "3.4 Stringification/empty-arg");
    });

    it("requires an extra level of indirection to expand a macro arg", function()
    {
        testFixture("preprocessor", "3.4 Stringification/two-level");
    });

    it("should remove leading/trailing whitespace and collapse inner whitespace", function()
    {
        testFixture("preprocessor", "3.4 Stringification/whitespace");
    });
});
