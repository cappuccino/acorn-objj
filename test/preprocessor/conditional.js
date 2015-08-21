"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var testFixture = utils.testFixture,
    dir = "4.2 Conditional Syntax/";

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Conditional syntax", function()
{
    it("#ifdef/#ifndef should evaluate the existence of a macro", function()
    {
        testFixture("preprocessor", dir + "#ifdef-#ifndef");
    });

    it("#if expressions may use integers", function()
    {
        testFixture("preprocessor", dir + "integers");
    });

    it("#if expressions may use arithmetic operators", function()
    {
        testFixture("preprocessor", dir + "arithmetic-operators");
    });

    it("#if expressions may use bit shift operators", function()
    {
        testFixture("preprocessor", dir + "bitshift-operators");
    });

    it("#if expressions may use bitwise operators", function()
    {
        testFixture("preprocessor", dir + "bitwise-operators");
    });

    it("#if expressions may use comparison operators", function()
    {
        testFixture("preprocessor", dir + "comparison-operators");
    });

    it("#if expressions may use unary operators", function()
    {
        testFixture("preprocessor", dir + "unary-operators");
    });

    it("#if expressions may use logical operators", function()
    {
        testFixture("preprocessor", dir + "logical-operators");
    });

    it("#if expressions may test for macro definitions with 'defined'", function()
    {
        testFixture("preprocessor", dir + "defined");
    });

    it("macros are expanded in #if expressions", function()
    {
        testFixture("preprocessor", dir + "macros");
    });

    it("identifiers and keywords in #if expressions that are not macros resolve to 0", function()
    {
        testFixture("preprocessor", dir + "identifiers");
    });

    it("Function-like macros without parens in #if expressions resolve to 0", function()
    {
        testFixture("preprocessor", dir + "function-like-macros");
    });

    it("sequential tests may be performed with #elif", function()
    {
        testFixture("preprocessor", dir + "#elif");
    });

    it("#if clauses may be nested", function()
    {
        testFixture("preprocessor", dir + "nesting");
    });

    it("directives should be ignored when expressions evaluate false", function()
    {
        testFixture("preprocessor", dir + "skipping");
    });
});
