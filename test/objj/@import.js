"use strict";

var chai = require("chai"),
    utils = require("../lib/test-utils");

chai.should();

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: disable maximumLineLength

describe("@import", function()
{
    it("should generate objj_ImportStatement nodes", function()
    {
        testFixture("@import");
    });

    it("should fail for unterminated filenames", function()
    {
        makeParser("@import \"foo.j\n")
            .should.throw(SyntaxError, /^Unterminated string constant/);

        makeParser("@import \"foo.j")
            .should.throw(SyntaxError, /^Unterminated string constant/);

        makeParser("@import <foo.j\n")
            .should.throw(SyntaxError, /^Unterminated import statement/);

        makeParser("@import <foo.j")
            .should.throw(SyntaxError, /^Unterminated import statement/);
    });

    it("should fail for malformed filenames", function()
    {
        makeParser("@import >foo.j<")
            .should.throw(SyntaxError, /^Expected " or < after @import/);
    });
});
