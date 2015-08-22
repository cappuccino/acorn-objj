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
});
