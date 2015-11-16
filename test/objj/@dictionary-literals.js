"use strict";

const
    expect = require("code").expect,
    utils = require("../lib/test-utils");

const  // jscs: ignore requireMultipleVarDecl
    makeParser = utils.makeParser,
    testFixture = utils.testFixture;

// jscs: disable maximumLineLength

describe("@{}", () =>
{
    it("should generate objj_DictionaryLiteral nodes, ignoring dangling commas", () =>
    {
        testFixture("objj", "dictionary-literal");
    });

    it("should fail with missing commas between items", () =>
    {
        expect(makeParser("var a = @{\"one\": 1 \"two\": 2}"))
            .to.throw(SyntaxError, /Expected ','/);
    });

    it("should fail with missing ':' after keys", () =>
    {
        expect(makeParser("var a = @{\"one\" 1, \"two\": 2}"))
            .to.throw(SyntaxError, /Expected ':'/);
    });
});
