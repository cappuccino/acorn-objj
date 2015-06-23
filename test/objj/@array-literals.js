"use strict";

var chai = require("chai"),
    utils = require("../lib/test-utils");

chai.should();

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */
/* eslint max-nested-callbacks:0 */

// jscs: disable maximumLineLength

describe("@[]", function()
{
    it("should generate objj_ArrayLiteral nodes", function()
    {
        testFixture("array-literal");
    });

    it("should fail with missing commas between elements", function()
    {
        makeParser("var a = @[1 2]")
            .should.throw(SyntaxError, /^Unexpected token/);
    });
});
