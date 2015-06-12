"use strict";

var chai = require("chai"),
    path = require("path"),
    parse = require("../lib/parse");

chai.should();
require("./lib/chai");

/* global describe, it */

var dir = "test/fixtures/objj";

function testFixture(file)
{
    parse.parseFileToString(path.join(dir, file + ".j"))
        .should.equalFixture(path.join("objj", file + ".json"));
}

function makeParser(source)
{
    return function() { parse.parse(source); };
}

describe("Objective-J plugin", function()
{
    describe("@[]", function()
    {
        it("should generate objj_ArrayLiteral nodes", function()
        {
            testFixture("array-literal");
        });

        it("should fail with missing commas between elements", function()
        {
            makeParser("var a = @[1 2]")
                .should.throw(SyntaxError, /^Unexpected token/);
        });
    });

    describe("@{}", function()
    {
        it("should generate objj_DictionaryLiteral nodes", function()
        {
            testFixture("dictionary-literal");
        });

        it("should fail with missing commas between items", function()
        {
            makeParser("var a = @{\"one\": 1 \"two\": 2}")
                .should.throw(SyntaxError, /^Expected ','/);
        });

        it("should fail with missing ':' after keys", function()
        {
            makeParser("var a = @{\"one\" 1, \"two\": 2}")
                .should.throw(SyntaxError, /^Expected ':'/);
        });
    });

    describe("@selector", function()
    {
        it("should generate objj_SelectorLiteralExpression nodes", function()
        {
            testFixture("@selector");
        });

        it("should generate an error with an empty selector", function()
        {
            makeParser("var s = @selector()")
                .should.throw(SyntaxError, /^Empty selector/);
        });

        it("should generate an error with missing selector components", function()
        {
            makeParser("var s = @selector(foo::)")
                .should.throw(SyntaxError, /^Missing selector component/);
        });

        it("should generate an error if ( does not follow @selector", function()
        {
            makeParser("var s = @selector{}")
                .should.throw(SyntaxError, /^Expected '\('/);
        });

        it("should generate an error with a malformed selector", function()
        {
            makeParser("var s = @selector(foo})")
                .should.throw(SyntaxError, /^Expected ':'/);
        });
    });
});
