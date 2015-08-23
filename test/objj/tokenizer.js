"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Tokenizer", function()
{
    // This is for code coverage
    it("tokenizer should use objj override of readWord with --no-preprocessor", function()
    {
        testFixture("objj", "ivars/types", { objjOptions: { preprocessor: false }});
    });

    it("tokenizer should fail with unrecognized @ keywords", function()
    {
        makeParser("@foo").should.throw(SyntaxError, /^Unrecognized Objective-J keyword/);
    });
});
