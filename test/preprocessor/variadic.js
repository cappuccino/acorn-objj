"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Variadic macros", function()
{
    it("should ignore empty named parameters", function()
    {
        testFixture("preprocessor", "3.6 Variadic Macros/empty-named-parameters");
    });

    it("should ignore empty variadic args", function()
    {
        testFixture("preprocessor", "3.6 Variadic Macros/empty-varargs");
    });

    it("should macro-expand arguments", function()
    {
        testFixture("preprocessor", "3.6 Variadic Macros/macro-expanded-args");
    });

    it("should allow use of named and variadic args together", function()
    {
        testFixture("preprocessor", "3.6 Variadic Macros/named+variadic");
    });

    it("should allow variadic args to be omitted if there is a named parameter", function()
    {
        testFixture("preprocessor", "3.6 Variadic Macros/named-parameter");
    });

    it("should allow the variadic parameter to be named", function()
    {
        testFixture("preprocessor", "3.6 Variadic Macros/named-varargs");
    });

    it("should allow named variadic args to be omitted if they are prefixed with ##", function()
    {
        testFixture("preprocessor", "3.6 Variadic Macros/omit-varargs");
    });

    it("can be used to create a sequence statement", function()
    {
        testFixture("preprocessor", "3.6 Variadic Macros/sequence");
    });
});
