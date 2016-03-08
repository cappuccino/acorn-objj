"use strict";

const
    expect = require("code").expect,
    utils = require("../lib/test-utils");

const  // jscs: ignore requireMultipleVarDecl
    makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* eslint-disable max-len */

describe("@protocol", () =>
{
    it("should generate objj_ProtocolDeclaration node with no protocols attributes for @protocol Foo", () =>
    {
        testFixture("objj", "@protocol/plain");
    });

    it("should generate protocols array attribute for @protocol that has a conforming protocol list", () =>
    {
        testFixture("objj", "@protocol/super-protocols");
    });

    it("should generate required objj_MethodDeclaration nodes for unmarked methods", () =>
    {
        testFixture("objj", "@protocol/unmarked-methods");
    });

    it("should generate required and optional objj_MethodDeclaration nodes for marked methods", () =>
    {
        testFixture("objj", "@protocol/marked-methods");
    });

    it("should generate objj_ProtocolLiteralExpression nodes for @protocol() literals", () =>
    {
        testFixture("objj", "@protocol/literal");
    });

    it("should generate an error if conforming protocols are not separated by ','", () =>
    {
        expect(makeParser("@protocol Foo <Bar Baz>"))
            .to.throw(SyntaxError, /Expected ',' between protocol names/);
    });

    it("should generate an error if EOF is reached before @end", () =>
    {
        expect(makeParser("@protocol Foo"))
            .to.throw(SyntaxError, /Expected @end after @protocol/);
    });

    it("should generate an error in strict-semicolon mode if a method declaration does not end with ';'", () =>
    {
        expect(makeParser("@protocol Foo\n- (void)foo\n@end", { strictSemicolons: true }))
            .to.throw(SyntaxError, /Expected a semicolon/);
    });

    it("should generate an error if a method declaration does not start with +/-", () =>
    {
        expect(makeParser("@protocol Foo\n(void)foo\n@end"))
            .to.throw(SyntaxError, /Method declaration must start with '\+' or '-'/);
    });

    it("should generate an error if ( does not follow @protocol", () =>
    {
        expect(makeParser("var s = @protocol{}"))
            .to.throw(SyntaxError, /Expected '\(' after @protocol/);
    });

    it("should generate an error with an empty protocol name", () =>
    {
        expect(makeParser("var s = @protocol()"))
            .to.throw(SyntaxError, /Unexpected token/);
    });

    it("should generate an error if ) does not follow the protocol name", () =>
    {
        expect(makeParser("var s = @protocol(SomeProtocol}"))
            .to.throw(SyntaxError, /Expected '\)' after protocol name/);
    });
});
