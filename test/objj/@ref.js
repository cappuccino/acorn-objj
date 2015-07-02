"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("@ref", function()
{
    it("should generate objj_Reference nodes", function()
    {
        testFixture("@ref");
    });

    it("should generate an error with an empty reference", function()
    {
        makeParser("var r = @ref()")
            .should.throw(SyntaxError, /^Empty reference/);
    });

    it("should generate an error if reference is not surrounded by parens", function()
    {
        makeParser("var r = @ref[foo)")
            .should.throw(SyntaxError, /^Expected '\('/);

        makeParser("var r = @ref(foo]")
            .should.throw(SyntaxError, /^Expected closing '\)'/);
    });
});
