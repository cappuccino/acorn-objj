"use strict";

const
    expect = require("code").expect,
    utils = require("../lib/test-utils");

const  // jscs: ignore requireMultipleVarDecl
    makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* eslint-disable max-len */

describe("@[]", () =>
{
    it("should generate objj_ArrayLiteral nodes", () =>
    {
        testFixture("objj", "array-literal");
    });

    it("should fail with missing commas between elements", () =>
    {
        expect(makeParser("var a = @[1 2]"))
            .to.throw(SyntaxError, /Expected ','/);
    });
});
