"use strict";

const
    expect = require("code").expect,
    utils = require("../../lib/test-utils");

const  // jscs: ignore requireMultipleVarDecl
    makeParser = utils.makeParser,
    testFixture = utils.testFixture;

// jscs: disable maximumLineLength

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

    it("should generate an error if @implementation or @interface is nested", () =>
    {
        expect(makeParser("@implementation Foo\n@implementation"))
            .to.throw(SyntaxError, /Expected @end before @implementation/);
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
