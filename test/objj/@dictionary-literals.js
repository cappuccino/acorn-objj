"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("@{}", function()
{
    it("should generate objj_DictionaryLiteral nodes, ignoring dangling commas", function()
    {
        testFixture("objj", "dictionary-literal");
    });

    it("should fail with missing commas between items", function()
    {
        makeParser("var a = @{\"one\": 1 \"two\": 2}")
            .should.throw(SyntaxError, /^Expected ','/);
    });

    it("should fail with missing ':' after keys", function()
    {
        makeParser("var a = @{\"one\" 1, \"two\": 2}")
            .should.throw(SyntaxError, /^Expected ':'/);
    });
});
