"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("@selector", function()
{
    it("should generate objj_SelectorLiteralExpression nodes", function()
    {
        testFixture("objj", "@selector");
    });

    it("should generate an error with an empty selector", function()
    {
        makeParser("var s = @selector()")
            .should.throw(SyntaxError, /^Empty selector/);
    });

    it("should generate an error with missing selector components", function()
    {
        makeParser("var s = @selector(foo::)")
            .should.throw(SyntaxError, /^Missing selector component/);
    });

    it("should generate an error if ( does not follow @selector", function()
    {
        makeParser("var s = @selector{}")
            .should.throw(SyntaxError, /^Expected '\('/);
    });

    it("should generate an error with a malformed selector", function()
    {
        makeParser("var s = @selector(foo})")
            .should.throw(SyntaxError, /^Expected ':'/);
    });
});
