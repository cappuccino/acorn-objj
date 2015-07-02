"use strict";

var makeParser = require("../lib/test-utils").makeParser;

/* global describe, it */

// jscs: disable maximumLineLength

describe("Tokenizer", function()
{
    it("tokenizer should fail with unrecognized @ keywords", function()
    {
        makeParser("@foo").should.throw(SyntaxError, /^Unrecognized Objective-J keyword/);
    });
});
