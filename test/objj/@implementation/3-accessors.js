"use strict";

var utils = require("../../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("accessors", function()
{
    it("should generate an empty accessors object for @acessors or @accessors()", function()
    {
        testFixture("objj", "@accessors/empty");
    });

    it("should generate an accessors object with property:\"name\" or getter:\"name\" for @acessors(property=name) or @accessors(getter=name)", function()
    {
        testFixture("objj", "@accessors/property-getter");
    });

    it("should generate an accessors object with setter:\"name:\" for @acessors(setter=name) or @accessors(setter=name:)", function()
    {
        testFixture("objj", "@accessors/setter");
    });

    it("should generate an accessors object with <attribute>:true for readonly, readwrite, and copy attributes", function()
    {
        testFixture("objj", "@accessors/attributes");
    });

    it("should generate an error for unknown @accessor attributes", function()
    {
        makeParser("@implementation Foo\n{ int foo @accessors(bar); }\n@end")
            .should.throw(SyntaxError, /^Unknown accessors attribute/);
    });

    it("should generate an error for unterminated @accessor attributes", function()
    {
        makeParser("@implementation Foo\n{ int foo @accessors(readonly]; }\n@end")
            .should.throw(SyntaxError, /^Expected '\)' after accessor attributes/);
    });
});
