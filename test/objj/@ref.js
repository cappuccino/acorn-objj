"use strict";

const
    expect = require("code").expect,
    utils = require("../lib/test-utils");

const  // jscs: ignore requireMultipleVarDecl
    makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* eslint-disable max-len */

describe("@ref", () =>
{
    it("should generate objj_Reference nodes", () =>
    {
        testFixture("objj", "@ref");
    });

    it("should generate an error with an empty reference", () =>
    {
        expect(makeParser("var r = @ref()"))
            .to.throw(SyntaxError, /Empty reference/);
    });

    it("should generate an error if reference is not surrounded by parens", () =>
    {
        expect(makeParser("var r = @ref[foo)"))
            .to.throw(SyntaxError, /Expected '\('/);

        expect(makeParser("var r = @ref(foo]"))
            .to.throw(SyntaxError, /Expected '\)'/);
    });
});
