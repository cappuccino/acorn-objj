"use strict";

const
    expect = require("code").expect,
    utils = require("../lib/test-utils");

const  // jscs: ignore requireMultipleVarDecl
    makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* eslint-disable max-len */

describe("@import", () =>
{
    it("should generate objj_ImportStatement nodes with local:true for @import \"path\"", () =>
    {
        testFixture("objj", "@import/local");
    });

    it("should generate objj_ImportStatement nodes with local:false for @import <path>", () =>
    {
        testFixture("objj", "@import/system");
    });

    it("should fail for unterminated filenames", () =>
    {
        expect(makeParser("@import \"foo.j\n"))
            .to.throw(SyntaxError, /Unterminated string constant/);

        expect(makeParser("@import \"foo.j"))
            .to.throw(SyntaxError, /Unterminated string constant/);

        expect(makeParser("@import <foo.j\n"))
            .to.throw(SyntaxError, /Unterminated import statement/);

        expect(makeParser("@import <foo.j"))
            .to.throw(SyntaxError, /Unterminated import statement/);
    });

    it("should fail for malformed filenames", () =>
    {
        expect(makeParser("@import >foo.j<"))
            .to.throw(SyntaxError, /Expected " or < after @import/);
    });
});
