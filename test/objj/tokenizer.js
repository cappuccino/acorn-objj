"use strict";

const
    expect = require("code").expect,
    utils = require("../lib/test-utils");

const makeParser = utils.makeParser; // jscs: ignore requireMultipleVarDecl

// jscs: disable maximumLineLength

describe("Tokenizer", () =>
{
    it("tokenizer should fail with unrecognized @ keywords", () =>
    {
        expect(makeParser("@foo")).to.throw(SyntaxError, /Unrecognized Objective-J keyword/);
    });

    it("should generate a reserved word error when using 'super' in ES < 6", () =>
    {
        expect(makeParser("var super;"))
            .to.throw(SyntaxError, /The keyword 'super' is reserved/);
    });
});
