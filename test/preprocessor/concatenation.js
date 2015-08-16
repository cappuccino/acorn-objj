"use strict";

var run = require("../lib/test-utils").run,
    utils = require("../lib/test-utils");

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

    it("should generate a warning if the concatenated token is invalid", function()
    {
        var result = run(["--no-color", "test/fixtures/preprocessor/3.5 Concatenation/invalid-token.j"]);

        result.output.should.equalFixture("preprocessor/3.5 Concatenation/invalid-token.txt", "invalid-token.j");
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
