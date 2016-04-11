"use strict";

const
    expect = require("code").expect,
    utils = require("../lib/test-utils");

const  // jscs: ignore requireMultipleVarDecl
    makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* eslint-disable max-len */

describe("@deref", () =>
{
    it("should generate objj_Dereference nodes", () =>
    {
        testFixture("objj", "@deref");
    });

    it("should generate an error with an empty dereference", () =>
    {
        expect(makeParser("@deref()"))
            .to.throw(SyntaxError, /Empty dereference/);
    });

    it("should generate an error if the reference is not an identifier", () =>
    {
        expect(makeParser("@deref(7)"))
            .to.throw(SyntaxError, /Unexpected token/);

        expect(makeParser("@deref(x ? ref1 : ref2)"))
            .to.throw(SyntaxError, /Expected '\)' after ref/);
    });

    it("should generate an error if the reference is not surrounded by parens", () =>
    {
        expect(makeParser("@deref[foo)"))
            .to.throw(SyntaxError, /Expected '\('/);

        expect(makeParser("@deref(foo]"))
            .to.throw(SyntaxError, /Expected '\)' after ref/);
    });
});
