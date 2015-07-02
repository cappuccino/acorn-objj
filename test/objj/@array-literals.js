"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
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
