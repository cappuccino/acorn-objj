"use strict";

var chai = require("chai"),
    makeParser = require("../lib/test-utils").makeParser;

chai.should();

/* global describe, it */

// jscs: disable maximumLineLength

describe("Tokenizer", function()
{
    it("tokenizer should fail with unrecognized @ keywords", function()
    {
        makeParser("@foo").should.throw(SyntaxError, /^Unrecognized Objective-J keyword/);
    });
});
