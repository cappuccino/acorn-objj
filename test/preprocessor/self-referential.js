"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var dir = "3.10.5 Self-Referential Macros/",
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Self-referential", function()
{
    it("circular references between macros are left unexpanded", function()
    {
        testFixture("preprocessor", dir + "circular");
    });

    it("circular calls within a single function-like macro are left unexpanded", function()
    {
        testFixture("preprocessor", dir + "function");
    });

    it("circular references within a single object-like macro are left unexpanded", function()
    {
        testFixture("preprocessor", dir + "object");
    });
});
