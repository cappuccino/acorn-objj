"use strict";

const
    expect = require("code").expect,
    utils = require("../lib/test-utils");

const  // jscs: ignore requireMultipleVarDecl
    makeParser = utils.makeParser,
    testFixture = utils.testFixture;

// jscs: disable maximumLineLength

describe("Message send", () =>
{
    it("should generate objj_MessageSend nodes with or without args", () =>
    {
        testFixture("objj", "message-send/args");
    });

    it("should correctly parse arrays within message sends", () =>
    {
        testFixture("objj", "message-send/arrays");
    });

    it("should work with empty selectors", () =>
    {
        testFixture("objj", "message-send/empty");
    });

    it("should correctly parse member expressions within message sends", () =>
    {
        testFixture("objj", "message-send/member-expressions");
    });

    it("should correctly set the receiver to \"super\"", () =>
    {
        testFixture("objj", "message-send/super");
    });

    it("should deal with subscript -> allowed implicit semicolon -> message send", () =>
    {
        testFixture("objj", "message-send/superscripts", { strictSemicolons: false });
    });

    it("should fail with subscript -> strict implicit semicolon -> message send", () =>
    {
        expect(makeParser("test[i]\n[foo bar];", { strictSemicolons: true }))
            .to.throw(SyntaxError, /Expected a semicolon/);
    });

    it("should parse variable arguments and store them in the varArgs attribute", () =>
    {
        testFixture("objj", "message-send/varargs");
    });

    it("should fail if a selector component is not followed by a colon", () =>
    {
        expect(makeParser("[view setTitle!title]"))
            .to.throw(SyntaxError, /Expected ':' in selector/);
    });
});
