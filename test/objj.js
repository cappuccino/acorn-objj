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
    describe("@ strings", function()
    {
        it("should generate Literal string nodes", function()
        {
            testFixture("string");
        });
    });

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

    describe("@import", function()
    {
        it("should generate objj_ImportStatement nodes", function()
        {
            testFixture("@import");
        });

        it("should fail for unterminated filenames", function()
        {
            makeParser("@import \"foo.j\n")
                .should.throw(SyntaxError, /^Unterminated string constant/);

            makeParser("@import \"foo.j")
                .should.throw(SyntaxError, /^Unterminated string constant/);

            makeParser("@import <foo.j\n")
                .should.throw(SyntaxError, /^Unterminated import statement/);

            makeParser("@import <foo.j")
                .should.throw(SyntaxError, /^Unterminated import statement/);
        });

        it("should fail for malformed filenames", function()
        {
            makeParser("@import >foo.j<")
                .should.throw(SyntaxError, /^Expected " or < after @import/);
        });
    });

    describe("@ref", function()
    {
        it("should generate objj_Reference nodes", function()
        {
            testFixture("@ref");
        });

        it("should generate an error with an empty reference", function()
        {
            makeParser("var r = @ref()")
                .should.throw(SyntaxError, /^Empty reference/);
        });

        it("should generate an error if reference is not surrounded by parens", function()
        {
            makeParser("var r = @ref[foo)")
                .should.throw(SyntaxError, /^Expected '\('/);

            makeParser("var r = @ref(foo]")
                .should.throw(SyntaxError, /^Expected closing '\)'/);
        });
    });

    describe("@deref", function()
    {
        it("should generate objj_Dereference nodes", function()
        {
            testFixture("@deref");
        });

        it("should generate an error with an empty dereference", function()
        {
            makeParser("@deref()")
                .should.throw(SyntaxError, /^Empty dereference/);
        });

        it("should generate an error if reference is not surrounded by parens", function()
        {
            makeParser("@deref[foo)")
                .should.throw(SyntaxError, /^Expected '\('/);

            makeParser("@deref(foo]")
                .should.throw(SyntaxError, /^Expected closing '\)'/);
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

    describe("Type declarations", function()
    {
        it("@class should generate objj_ClassStatement nodes", function()
        {
            testFixture("type-declaration");
        });

        it("@global should generate objj_GlobalStatement nodes", function()
        {
            testFixture("type-declaration");
        });

        it("@typedef should generate objj_TypeDefStatement nodes", function()
        {
            testFixture("type-declaration");
        });
    });
});
