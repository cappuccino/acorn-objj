"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Function-like macros", function()
{
    it("can be called like functions", function()
    {
        testFixture("preprocessor", "3.2 Function-like Macros/called-like-functions");
    });

    it("should not be expanded if called with args", function()
    {
        testFixture("preprocessor", "3.2 Function-like Macros/function-macros-without-args");
    });

    it("should not recognize parameter lists unless they directly follow the macro name", function()
    {
        testFixture("preprocessor", "3.2 Function-like Macros/parameters-must-follow-name");
    });
});
