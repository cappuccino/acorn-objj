"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var testFixture = utils.testFixture,
    baseDir = "4.2 Conditional Syntax/";

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Conditional syntax", function()
{
    it("#ifdef/#ifndef should evaluate the existence of a macro", function()
    {
        testFixture("preprocessor", baseDir + "#ifdef-#ifndef");
    });

    it("#if expressions may use integers", function()
    {
        testFixture("preprocessor", baseDir + "integers");
    });

    it("#if expressions may use arithmetic operators", function()
    {
        testFixture("preprocessor", baseDir + "arithmetic-operators");
    });

    it("#if expressions may use bit shift operators", function()
    {
        testFixture("preprocessor", baseDir + "bitshift-operators");
    });

    it("#if expressions may use bitwise operators", function()
    {
        testFixture("preprocessor", baseDir + "bitwise-operators");
    });

    it("#if expressions may use comparison operators", function()
    {
        testFixture("preprocessor", baseDir + "comparison-operators");
    });

    it("#if expressions may use unary operators", function()
    {
        testFixture("preprocessor", baseDir + "unary-operators");
    });

    it("#if expressions may use logical operators", function()
    {
        testFixture("preprocessor", baseDir + "logical-operators");
    });

    it("#if expressions may test for macro definitions with 'defined'", function()
    {
        testFixture("preprocessor", baseDir + "defined");
    });

    it("Macros are expanded in #if expressions", function()
    {
        testFixture("preprocessor", baseDir + "macros");
    });

    it("Identifiers in #if expressions that are not macros resolve to 0", function()
    {
        testFixture("preprocessor", baseDir + "identifiers");
    });

    it("Function-like macros without parens in #if expressions resolve to 0", function()
    {
        testFixture("preprocessor", baseDir + "function-like-macros");
    });

    it("Sequential tests may be performed with #elif", function()
    {
        testFixture("preprocessor", baseDir + "#elif");
    });

    it("#if clauses may be nested", function()
    {
        testFixture("preprocessor", baseDir + "nesting");
    });
});
