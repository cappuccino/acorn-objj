"use strict";

var chai = require("chai"),
    utils = require("../lib/test-utils");

chai.should();

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: disable maximumLineLength

describe("@implementation", function()
{
    describe("declaration", function()
    {
        it("should generate objj_ClassDeclaration nodes with superclass, category and protocol attributes", function()
        {
            testFixture("@implementation");
        });

        it("should generate an error if @implementation or @interface is nested", function()
        {
            makeParser("@implementation Foo\n@implementation")
                .should.throw(SyntaxError, /^Expected @end before @implementation/);
        });

        it("should generate an error if the category is not terminated with ')'", function()
        {
            makeParser("@implementation Foo (Bar]")
                .should.throw(SyntaxError, /^Expected closing '\)' after category name/);
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

    describe("ivars", function()
    {
        it("should generate objj_IvarDeclaration and objj_ObjectiveJType nodes, and set isOutlet for ivars marked with @outlet or IBOutlet", function()
        {
            testFixture("ivars");
        });

        it("should generate objj_IvarDeclaration nodes with accessors attribute for @accessors", function()
        {
            testFixture("@accessors");
        });

        it("should generate an empty protocol list error for id<> as a type", function()
        {
            makeParser("@implementation Foo\n{ id<> foo }\n@end")
                .should.throw(SyntaxError, /^Empty protocol list/);
        });

        it("should generate an error for a missing comma in a protocal list", function()
        {
            makeParser("@implementation Foo\n{ id<Test Me> foo }\n@end")
                .should.throw(SyntaxError, /^Expected a comma between protocols/);
        });

        it("should generate an error for a missing semicolon with strictSemicolons", function()
        {
            makeParser("@implementation Foo\n{ int foo }\n@end", { strictSemicolons: true })
                .should.throw(SyntaxError, /^Expected a semicolon/);
        });

        it("should generate an error in strict mode if a reserved word is used for the type or name", function()
        {
            makeParser("@implementation Foo\n{ super foo }\n@end", { sourceType: "module" })
                .should.throw(SyntaxError, /^Binding 'super' in strict mode/);

            makeParser("@implementation Foo\n{ int export }\n@end", { sourceType: "module" })
                .should.throw(SyntaxError, /^Binding 'export' in strict mode/);
        });

        it("should generate an error for unknown @accessor attributes", function()
        {
            makeParser("@implementation Foo\n{ int foo @accessors(bar); }\n@end")
                .should.throw(SyntaxError, /^Unknown accessors attribute/);
        });
    });

    describe("methods", function()
    {
        it("should generate objj_MethodDeclaration nodes with correct attributes", function()
        {
            testFixture("methods");
        });

        it("should generate an error for unknown @accessor attributes", function()
        {
            makeParser("@implementation Foo\n{ int foo @accessors(bar); }\n@end")
                .should.throw(SyntaxError, /^Unknown accessors attribute/);
        });

        it("should generate an error for missing ... after ,", function()
        {
            makeParser("@implementation Foo\n- (void)foo:(int)f,\n@end")
                .should.throw(SyntaxError, /^Expected '...' after ','/);
        });
    });
});
