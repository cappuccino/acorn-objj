"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var testFixture = utils.testFixture,
    baseDir = "3.5 Concatenation/";

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Concatenation", function()
{
    it("should be ignored if an argument on either side of ## is empty", function()
    {
        testFixture("preprocessor", baseDir + "empty-arg");
    });

    it("should leave tokens as is if the concatenated token is invalid", function()
    {
        testFixture("preprocessor", baseDir + "invalid-token");
    });

    it("should paste only the trailing token on the left and leading token on the right", function()
    {
        testFixture("preprocessor", baseDir + "leading-trailing");
    });

    it("should not macro-expand arguments", function()
    {
        testFixture("preprocessor", baseDir + "no-expand-arg");
    });

    it("should work alongside stringification", function()
    {
        testFixture("preprocessor", baseDir + "stringify-and-concatenate");
    });
});
