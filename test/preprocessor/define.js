"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("#define", function()
{
    it("should substitute macro arguments", function()
    {
        testFixture("preprocessor", "define/define");
    });
});
