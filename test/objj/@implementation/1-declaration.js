"use strict";

const
    expect = require("code").expect,
    utils = require("../../lib/test-utils");

const  // jscs: ignore requireMultipleVarDecl
    makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* eslint-disable max-len */

describe("declaration", () =>
{
    it("should generate objj_ClassDeclaration node", () =>
    {
        testFixture("objj", "@implementation/simple");
    });

    it("should generate superclass attribute for subclasses", () =>
    {
        testFixture("objj", "@implementation/superclass");
    });

    it("should generate category attribute for categories", () =>
    {
        testFixture("objj", "@implementation/category");
    });

    it("should generate protocols array attribute for classes conforming to protocols", () =>
    {
        testFixture("objj", "@implementation/protocols");
    });

    it("should allow certain statements other than methods between @implementation and @end", () =>
    {
        testFixture("objj", "@implementation/statements");
    });

    it("should generate an error if invalid statements are found between @implementation and @end", () =>
    {
        expect(makeParser("@implementation Foo\ntest()\n@end"))
            .to.throw(SyntaxError, /Unexpected statement within an @implementation/);
    });

    it("should generate an error if the category is not terminated with ')'", () =>
    {
        expect(makeParser("@implementation Foo (Bar]"))
            .to.throw(SyntaxError, /Expected '\)' after category name/);
    });

    it("should generate an error if the protocols are not separated by ','", () =>
    {
        expect(makeParser("@implementation Foo <Bar Baz>"))
            .to.throw(SyntaxError, /Expected ',' between protocol names/);
    });

    it("should generate an error if EOF is reached before @end", () =>
    {
        expect(makeParser("@implementation Foo"))
            .to.throw(SyntaxError, /Expected @end after @implementation/);
    });
});
