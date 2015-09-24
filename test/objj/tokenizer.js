"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var makeParser = utils.makeParser;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Tokenizer", function()
{
    it("tokenizer should fail with unrecognized @ keywords", function()
    {
        makeParser("@foo").should.throw(SyntaxError, /Unrecognized Objective-J keyword/);
    });
});
