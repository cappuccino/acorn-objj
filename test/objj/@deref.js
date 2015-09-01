"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("@deref", function()
{
    it("should generate objj_Dereference nodes", function()
    {
        testFixture("objj", "@deref");
    });

    it("should generate an error with an empty dereference", function()
    {
        makeParser("@deref()")
            .should.throw(SyntaxError, /Empty dereference/);
    });

    it("should generate an error if reference is not surrounded by parens", function()
    {
        makeParser("@deref[foo)")
            .should.throw(SyntaxError, /Expected '\('/);

        makeParser("@deref(foo]")
            .should.throw(SyntaxError, /Expected '\)' after ref/);
    });
});
