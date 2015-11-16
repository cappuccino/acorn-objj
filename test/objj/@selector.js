"use strict";

const
    expect = require("code").expect,
    utils = require("../lib/test-utils");

const  // jscs: ignore requireMultipleVarDecl
    makeParser = utils.makeParser,
    testFixture = utils.testFixture;

// jscs: disable maximumLineLength

describe("@selector", () =>
{
    it("should generate objj_SelectorLiteralExpression nodes", () =>
    {
        testFixture("objj", "@selector");
    });

    it("should generate an error with an empty selector", () =>
    {
        expect(makeParser("var s = @selector()"))
            .to.throw(SyntaxError, /Empty selector/);
    });

    it("should generate an error with missing selector components", () =>
    {
        expect(makeParser("var s = @selector(foo::)"))
            .to.throw(SyntaxError, /Missing selector component/);
    });

    it("should generate an error if ( does not follow @selector", () =>
    {
        expect(makeParser("var s = @selector{}"))
            .to.throw(SyntaxError, /Expected '\('/);
    });

    it("should generate an error with a malformed selector", () =>
    {
        expect(makeParser("var s = @selector(foo})"))
            .to.throw(SyntaxError, /Expected ':'/);
    });
});
