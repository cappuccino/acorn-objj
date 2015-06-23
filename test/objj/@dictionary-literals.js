"use strict";

var chai = require("chai"),
    utils = require("../lib/test-utils");

chai.should();

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */
/* eslint max-nested-callbacks:0 */

// jscs: disable maximumLineLength

describe("@{}", function()
{
    it("should generate objj_DictionaryLiteral nodes", function()
    {
        testFixture("dictionary-literal");
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
