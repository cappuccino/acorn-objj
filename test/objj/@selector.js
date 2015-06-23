"use strict";

var chai = require("chai"),
    utils = require("../lib/test-utils");

chai.should();

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */
/* eslint max-nested-callbacks:0 */

// jscs: disable maximumLineLength

describe("@selector", function()
{
    it("should generate objj_SelectorLiteralExpression nodes", function()
    {
        testFixture("@selector");
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
