"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Pragmas", function()
{
    it("completely ignore what comes after the directive", function()
    {
        testFixture("preprocessor", "7 Pragmas/pragmas");
    });
});
