"use strict";

const
    expect = require("code").expect,
    utils = require("../lib/test-utils");

const  // jscs: ignore requireMultipleVarDecl
    makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* eslint-disable max-len */

describe("self", () =>
{
    it("should allow assignment to self and self as receiver", () =>
    {
        testFixture("objj", "self");
    });

    it("should fail if assignment is made to super", () =>
    {
        expect(makeParser("@implementation Test - (void)test { super = 7; } @end"))
            .to.throw(SyntaxError, /Assigning to rvalue/);
    });
});
