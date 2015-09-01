"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("@import", function()
{
    // Turn the preprocessor off so we get code coverage of the non-preprocessor code
    var options = { objjOptions: { preprocessor: false }};

    it("should generate objj_ImportStatement nodes with local:true for @import \"path\"", function()
    {
        testFixture("objj", "@import/local", options);
    });

    it("should generate objj_ImportStatement nodes with local:false for @import <path>", function()
    {
        testFixture("objj", "@import/system", options);
    });

    it("should fail for unterminated filenames", function()
    {
        makeParser("@import \"foo.j\n")
            .should.throw(SyntaxError, /Unterminated string constant/);

        makeParser("@import \"foo.j")
            .should.throw(SyntaxError, /Unterminated string constant/);

        makeParser("@import <foo.j\n")
            .should.throw(SyntaxError, /Unterminated import statement/);

        makeParser("@import <foo.j")
            .should.throw(SyntaxError, /Unterminated import statement/);
    });

    it("should fail for malformed filenames", function()
    {
        makeParser("@import >foo.j<")
            .should.throw(SyntaxError, /Expected " or < after @import/);
    });
});
