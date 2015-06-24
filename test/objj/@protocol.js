"use strict";

var chai = require("chai"),
    utils = require("../lib/test-utils");

chai.should();

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: disable maximumLineLength

describe("@protocol", function()
{
    it("should generate objj_ProtocolDeclaration nodes with protocol, optional and required attributes, and with objj_MethodDeclaration nodes", function()
    {
        testFixture("@protocol");
    });

    it("should generate an error if the protocols are not separated by ','", function()
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
