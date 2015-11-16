"use strict";

const
    expect = require("code").expect,
    utils = require("../../lib/test-utils");

const  // jscs: ignore requireMultipleVarDecl
    makeParser = utils.makeParser,
    testFixture = utils.testFixture;

// jscs: disable maximumLineLength

describe("ivars", () =>
{
    it("should generate objj_ClassDeclaration with empty ivars array attribute for {}", () =>
    {
        testFixture("objj", "ivars/empty");
    });

    it("should generate objj_IvarDeclaration and objj_ObjectiveJType nodes with isClass:false for built in types", () =>
    {
        testFixture("objj", "ivars/types");
    });

    it("should generate objj_ObjectiveJType nodes with isOutlet:true for ivars marked with @outlet or IBOutlet", () =>
    {
        testFixture("objj", "ivars/outlets");
    });

    it("should generate objj_ObjectiveJType nodes with protocols array attribute set for id<Foo, Bar>", () =>
    {
        testFixture("objj", "ivars/protocols");
    });

    it("should generate an empty protocol list error for id<> as a type", () =>
    {
        expect(makeParser("@implementation Foo\n{ id<> foo }\n@end"))
            .to.throw(SyntaxError, /Empty protocol list/);
    });

    it("should generate an error for a missing comma in a protocol list", () =>
    {
        expect(makeParser("@implementation Foo\n{ id<Test Me> foo }\n@end"))
            .to.throw(SyntaxError, /Expected a comma between protocols/);
    });

    it("should generate an error for a missing semicolon with strictSemicolons", () =>
    {
        expect(makeParser("@implementation Foo\n{ int foo }\n@end", { strictSemicolons: true }))
            .to.throw(SyntaxError, /Expected a semicolon/);
    });

    it("should generate an error in strict mode if a reserved word is used for the type or name", () =>
    {
        // Set sourceType: "module" to force strict mode
        expect(makeParser("@implementation Foo\n{ export foo }\n@end", { sourceType: "module" }))
            .to.throw(SyntaxError, /The keyword 'export' is reserved/);

        expect(makeParser("@implementation Foo\n{ int export }\n@end", { sourceType: "module" }))
            .to.throw(SyntaxError, /The keyword 'export' is reserved/);
    });

    it("should generate an error if a keyword is used for the type or name", () =>
    {
        expect(makeParser("@implementation Foo\n{ break foo }\n@end"))
            .to.throw(SyntaxError, /Unexpected token/);

        expect(makeParser("@implementation Foo\n{ int break }\n@end"))
            .to.throw(SyntaxError, /Unexpected token/);

        // super is a keyword in ES6+
        expect(makeParser("@implementation Foo\n{ super foo }\n@end", { ecmaVersion: 6 }))
            .to.throw(SyntaxError, /Unexpected token/);

        expect(makeParser("@implementation Foo\n{ int super }\n@end", { ecmaVersion: 6 }))
            .to.throw(SyntaxError, /Unexpected token/);
    });
});
