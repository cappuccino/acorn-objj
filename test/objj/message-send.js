"use strict";

var chai = require("chai"),
    utils = require("../lib/test-utils");

chai.should();

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: disable maximumLineLength

describe("Message send", function()
{
    it("should generate objj_MessageSend nodes with or without args", function()
    {
        testFixture("message-send/args");
    });

    it("should correctly parse arrays within message sends", function()
    {
        testFixture("message-send/arrays");
    });

    it("should work with empty selectors", function()
    {
        testFixture("message-send/empty");
    });

    it("should correctly parse member expressions within message sends", function()
    {
        testFixture("message-send/member-expressions");
    });

    it("should correctly set the receiver to \"super\"", function()
    {
        testFixture("message-send/super");
    });

    it("should deal with subscript -> allowed implicit semicolon -> message send", function()
    {
        testFixture("message-send/superscripts", { strictSemicolons: false });
    });

    it("should fail with subscript -> strict implicit semicolon -> message send", function()
    {
        makeParser("test[i]\n[foo bar];", { strictSemicolons: true })
            .should.throw(SyntaxError, /^Expected a semicolon/);
    });

    it("should parse variable arguments and store them in the varArgs attribute", function()
    {
        testFixture("message-send/varargs");
    });

    it("should fail if a selector component is not followed by a colon", function()
    {
        makeParser("[view setTitle!title]")
            .should.throw(SyntaxError, /^Expected ':' in selector/);
    });
});
