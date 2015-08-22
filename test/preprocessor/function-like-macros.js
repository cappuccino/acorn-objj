"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var dir = "3.2 Function-like Macros/",
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Function-like macros", function()
{
    it("can be called like functions", function()
    {
        testFixture("preprocessor", dir + "called-like-functions");
    });

    it("should not be expanded if referenced without args", function()
    {
        testFixture("preprocessor", dir + "function-macros-without-args");
    });

    it("should not recognize parameter lists unless they directly follow the macro name", function()
    {
        testFixture("preprocessor", dir + "parameters-must-follow-name");
    });
});
