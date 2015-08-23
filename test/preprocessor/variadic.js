"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var dir = "3.6 Variadic Macros/",
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Variadic macros", function()
{
    it("should ignore empty named parameters", function()
    {
        testFixture("preprocessor", dir + "empty-named-parameters");
    });

    it("should ignore empty variadic args", function()
    {
        testFixture("preprocessor", dir + "empty-varargs");
    });

    it("should macro-expand arguments", function()
    {
        testFixture("preprocessor", dir + "macro-expanded-args");
    });

    it("should allow use of named and variadic args together", function()
    {
        testFixture("preprocessor", dir + "named+variadic");
    });

    it("should allow variadic args to be omitted if there is a named parameter", function()
    {
        testFixture("preprocessor", dir + "named-parameter");
    });

    it("should allow the variadic parameter to be named", function()
    {
        testFixture("preprocessor", dir + "named-varargs");
    });

    it("should allow named variadic args to be omitted if they are prefixed with ##", function()
    {
        testFixture("preprocessor", dir + "omit-varargs");
    });

    it("can be used to create a sequence statement", function()
    {
        testFixture("preprocessor", dir + "sequence");
    });
});