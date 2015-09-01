"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Message send", function()
{
    it("should generate objj_MessageSend nodes with or without args", function()
    {
        testFixture("objj", "message-send/args");
    });

    it("should correctly parse arrays within message sends", function()
    {
        testFixture("objj", "message-send/arrays");
    });

    it("should work with empty selectors", function()
    {
        testFixture("objj", "message-send/empty");
    });

    it("should correctly parse member expressions within message sends", function()
    {
        testFixture("objj", "message-send/member-expressions");
    });

    it("should correctly set the receiver to \"super\"", function()
    {
        testFixture("objj", "message-send/super");
    });

    it("should deal with subscript -> allowed implicit semicolon -> message send", function()
    {
        testFixture("objj", "message-send/superscripts", { strictSemicolons: false });
    });

    it("should fail with subscript -> strict implicit semicolon -> message send", function()
    {
        makeParser("test[i]\n[foo bar];", { strictSemicolons: true })
            .should.throw(SyntaxError, /Expected a semicolon/);
    });

    it("should parse variable arguments and store them in the varArgs attribute", function()
    {
        testFixture("objj", "message-send/varargs");
    });

    it("should fail if a selector component is not followed by a colon", function()
    {
        makeParser("[view setTitle!title]")
            .should.throw(SyntaxError, /Expected ':' in selector/);
    });
});
