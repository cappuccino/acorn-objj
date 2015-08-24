"use strict";

var utils = require("../../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("declaration", function()
{
    it("should generate objj_ClassDeclaration node", function()
    {
        testFixture("objj", "@implementation/simple");
    });

    it("should generate superclass attribute for subclasses", function()
    {
        testFixture("objj", "@implementation/superclass");
    });

    it("should generate category attribute for categories", function()
    {
        testFixture("objj", "@implementation/category");
    });

    it("should generate protocols array attribute for classes conforming to protocols", function()
    {
        testFixture("objj", "@implementation/protocols");
    });

    it("should generate an error if @implementation or @interface is nested", function()
    {
        makeParser("@implementation Foo\n@implementation")
            .should.throw(SyntaxError, /^Expected @end before @implementation/);
    });

    it("should generate an error if the category is not terminated with ')'", function()
    {
        makeParser("@implementation Foo (Bar]")
            .should.throw(SyntaxError, /^Expected '\)' after category name/);
    });

    it("should generate an error if the protocols are not separated by ','", function()
    {
        makeParser("@implementation Foo <Bar Baz>")
            .should.throw(SyntaxError, /^Expected ',' between protocol names/);
    });

    it("should generate an error if EOF is reached before @end", function()
    {
        makeParser("@implementation Foo")
            .should.throw(SyntaxError, /^Expected @end after @implementation/);
    });
});
