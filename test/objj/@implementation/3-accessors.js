"use strict";

const
    expect = require("code").expect,
    utils = require("../../lib/test-utils");

const  // jscs: ignore requireMultipleVarDecl
    makeParser = utils.makeParser,
    testFixture = utils.testFixture;

// jscs: disable maximumLineLength

describe("accessors", () =>
{
    it("should generate an empty accessors object for @acessors or @accessors()", () =>
    {
        testFixture("objj", "@accessors/empty");
    });

    it("should generate an accessors object with property:\"name\" or getter:\"name\" for @acessors(property=name) or @accessors(getter=name)", () =>
    {
        testFixture("objj", "@accessors/property-getter");
    });

    it("should generate an accessors object with setter:\"name:\" for @acessors(setter=name) or @accessors(setter=name:)", () =>
    {
        testFixture("objj", "@accessors/setter");
    });

    it("should generate an accessors object with attribute:true for readonly, readwrite, and copy attributes", () =>
    {
        testFixture("objj", "@accessors/attributes");
    });

    it("should generate an error for unknown @accessor attributes", () =>
    {
        expect(makeParser("@implementation Foo\n{ int foo @accessors(bar); }\n@end"))
            .to.throw(SyntaxError, /Unknown accessors attribute/);
    });

    it("should generate an error for unterminated @accessor attributes", () =>
    {
        expect(makeParser("@implementation Foo\n{ int foo @accessors(readonly]; }\n@end"))
            .to.throw(SyntaxError, /Expected '\)' after accessor attributes/);
    });
});
