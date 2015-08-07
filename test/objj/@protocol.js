"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("@protocol", function()
{
    it("should generate objj_ProtocolDeclaration node with no protocols attributes for @protocol Foo", function()
    {
        testFixture("objj", "@protocol/plain");
    });

    it("should generate protocols array attribute for @protocol that has a conforming protocol list", function()
    {
        testFixture("objj", "@protocol/super-protocols");
    });

    it("should generate required objj_MethodDeclaration nodes for unmarked methods", function()
    {
        testFixture("objj", "@protocol/unmarked-methods");
    });

    it("should generate required and optional objj_MethodDeclaration nodes for marked methods", function()
    {
        testFixture("objj", "@protocol/marked-methods");
    });

    it("should generate an error if conforming protocols are not separated by ','", function()
    {
        makeParser("@protocol Foo <Bar Baz>")
            .should.throw(SyntaxError, /^Expected ',' between protocol names/);
    });

    it("should generate an error if EOF is reached before @end", function()
    {
        makeParser("@protocol Foo")
            .should.throw(SyntaxError, /^Expected @end after @protocol/);
    });

    it("should generate an error in strict-semicolon mode if a method declaration does not end with ';'", function()
    {
        makeParser("@protocol Foo\n- (void)foo\n@end", { strictSemicolons: true })
            .should.throw(SyntaxError, /^Expected a semicolon/);
    });
});
