"use strict";

const
    expect = require("code").expect,
    utils = require("../lib/test-utils");

const // jscs: ignore requireMultipleVarDecl
    makeParser = utils.makeParser,
    testFixture = utils.testFixture;

// jscs: disable maximumLineLength

describe("Type declarations", () =>
{
    it("@class should generate objj_ClassStatement nodes", () =>
    {
        testFixture("objj", "type-declarations/@class");
    });

    it("@global should generate objj_GlobalStatement nodes", () =>
    {
        testFixture("objj", "type-declarations/@global");
    });

    it("@typedef should generate objj_TypeDefStatement nodes", () =>
    {
        testFixture("objj", "type-declarations/@typedef");
    });

    it("should generate an error if a keyword or reserved word is used as the name for @class/@global/@typedef", () =>
    {
        expect(makeParser("@class break")).to.throw(SyntaxError, /Unexpected token/);
        expect(makeParser("@global break")).to.throw(SyntaxError, /Unexpected token/);
        expect(makeParser("@typedef break")).to.throw(SyntaxError, /Unexpected token/);

        expect(makeParser("@class int")).to.throw(SyntaxError, /Unexpected token/);
        expect(makeParser("@global int")).to.throw(SyntaxError, /Unexpected token/);
        expect(makeParser("@typedef int")).to.throw(SyntaxError, /Unexpected token/);

        expect(makeParser("@class export")).to.throw(SyntaxError, /The keyword 'export' is reserved/);
        expect(makeParser("@global export")).to.throw(SyntaxError, /The keyword 'export' is reserved/);
        expect(makeParser("@typedef export")).to.throw(SyntaxError, /The keyword 'export' is reserved/);
    });
});
