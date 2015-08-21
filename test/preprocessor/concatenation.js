"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var dir = "3.5 Concatenation/",
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Concatenation", function()
{
    it("should be ignored if an argument on either side of ## is empty", function()
    {
        testFixture("preprocessor", dir + "empty-arg");
    });

    it("should leave tokens as is if the concatenated token is invalid", function()
    {
        testFixture("preprocessor", dir + "invalid-token");
    });

    it("should paste only the trailing token on the left and leading token on the right", function()
    {
        testFixture("preprocessor", dir + "leading-trailing");
    });

    it("should not macro-expand arguments", function()
    {
        testFixture("preprocessor", dir + "no-expand-arg");
    });

    it("should work alongside stringification", function()
    {
        testFixture("preprocessor", dir + "stringify-and-concatenate");
    });
});
