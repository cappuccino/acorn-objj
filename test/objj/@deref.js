"use strict";

var chai = require("chai"),
    utils = require("../lib/test-utils");

chai.should();

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */
/* eslint max-nested-callbacks:0 */

// jscs: disable maximumLineLength

describe("@deref", function()
{
    it("should generate objj_Dereference nodes", function()
    {
        testFixture("@deref");
    });

    it("should generate an error with an empty dereference", function()
    {
        makeParser("@deref()")
            .should.throw(SyntaxError, /^Empty dereference/);
    });

    it("should generate an error if reference is not surrounded by parens", function()
    {
        makeParser("@deref[foo)")
            .should.throw(SyntaxError, /^Expected '\('/);

        makeParser("@deref(foo]")
            .should.throw(SyntaxError, /^Expected closing '\)'/);
    });
});
