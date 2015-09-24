"use strict";

var utils = require("../../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("ivars", function()
{
    it("should generate objj_ClassDeclaration with empty ivars array attribute for {}", function()
    {
        testFixture("objj", "ivars/empty");
    });

    it("should generate objj_IvarDeclaration and objj_ObjectiveJType nodes with isClass:false for built in types", function()
    {
        testFixture("objj", "ivars/types");
    });

    it("should generate objj_ObjectiveJType nodes with isOutlet:true for ivars marked with @outlet or IBOutlet", function()
    {
        testFixture("objj", "ivars/outlets");
    });

    it("should generate objj_ObjectiveJType nodes with protocols array attribute set for id<Foo, Bar>", function()
    {
        testFixture("objj", "ivars/protocols");
    });

    it("should generate an empty protocol list error for id<> as a type", function()
    {
        makeParser("@implementation Foo\n{ id<> foo }\n@end")
            .should.throw(SyntaxError, /Empty protocol list/);
    });

    it("should generate an error for a missing comma in a protocal list", function()
    {
        makeParser("@implementation Foo\n{ id<Test Me> foo }\n@end")
            .should.throw(SyntaxError, /Expected a comma between protocols/);
    });

    it("should generate an error for a missing semicolon with strictSemicolons", function()
    {
        makeParser("@implementation Foo\n{ int foo }\n@end", { strictSemicolons: true })
            .should.throw(SyntaxError, /Expected a semicolon/);
    });

    it("should generate an error in strict mode if a reserved word is used for the type or name", function()
    {
        makeParser("@implementation Foo\n{ super foo }\n@end", { sourceType: "module" })
            .should.throw(SyntaxError, /Binding 'super' in strict mode/);

        makeParser("@implementation Foo\n{ int export }\n@end", { sourceType: "module" })
            .should.throw(SyntaxError, /Binding 'export' in strict mode/);
    });
});
