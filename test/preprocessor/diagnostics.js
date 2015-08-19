"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var testFixture = utils.testFixture,
    dir = "5 Diagnostics/";

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Diagnostics", function()
{
    it("#warning and #error should generate warnings and errors", function()
    {
        testFixture("preprocessor", dir + "diagnostics");
    });
});
