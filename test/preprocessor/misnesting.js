"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var dir = "3.10.1 Misnesting/",
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Misnesting", function()
{
    it("macro definitions and arguments do not have to have balanced parentheses", function()
    {
        testFixture("preprocessor", dir + "strange");
    });

    it("a macro call can come partially from the macro body and partially from the arguments", function()
    {
        testFixture("preprocessor", dir + "twice");
    });
});
