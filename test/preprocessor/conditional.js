"use strict";

var issueHandler = require("acorn-issue-handler"),
    utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var testFixture = utils.testFixture,
    makeParser = utils.makeParser,
    dir = "4.2 Conditional Syntax/";

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Conditional syntax", function()
{
    it("#ifdef/#ifndef should evaluate the existence of a macro", function()
    {
        testFixture("preprocessor", dir + "#ifdef-#ifndef");
    });

    it("#if expressions may use integers", function()
    {
        testFixture("preprocessor", dir + "integers");
    });

    it("#if expressions may use arithmetic operators", function()
    {
        testFixture("preprocessor", dir + "arithmetic-operators");
    });

    it("#if expressions may use bit shift operators", function()
    {
        testFixture("preprocessor", dir + "bitshift-operators");
    });

    it("#if expressions may use bitwise operators", function()
    {
        testFixture("preprocessor", dir + "bitwise-operators");
    });

    it("#if expressions may use comparison operators", function()
    {
        testFixture("preprocessor", dir + "comparison-operators");
    });

    it("#if expressions may use unary operators", function()
    {
        testFixture("preprocessor", dir + "unary-operators");
    });

    it("#if expressions may use logical operators", function()
    {
        testFixture("preprocessor", dir + "logical-operators");
    });

    it("#if expressions may test for macro definitions with 'defined'", function()
    {
        testFixture("preprocessor", dir + "defined");
    });

    it("macros are expanded in #if expressions", function()
    {
        testFixture("preprocessor", dir + "macros");
    });

    it("identifiers and keywords in #if expressions that are not macros resolve to 0", function()
    {
        testFixture("preprocessor", dir + "identifiers");
    });

    it("Function-like macros without parens in #if expressions resolve to 0", function()
    {
        testFixture("preprocessor", dir + "function-like-macros");
    });

    it("sequential tests may be performed with #elif", function()
    {
        testFixture("preprocessor", dir + "#elif");
    });

    it("#if clauses may be nested", function()
    {
        testFixture("preprocessor", dir + "nesting");
    });

    it("directives should be ignored when expressions evaluate false", function()
    {
        testFixture("preprocessor", dir + "skipping");
    });

    it("#if without balancing #endif at EOF is an error", function()
    {
        makeParser("#if 7\n")
            .should.throw(SyntaxError, /^Unterminated #if at EOF/);
    });

    it("#ifdef without balancing #endif at EOF is an error", function()
    {
        makeParser("#ifdef FOO\n")
            .should.throw(SyntaxError, /^Unterminated #ifdef at EOF/);
    });

    it("#else without balancing #if is an error", function()
    {
        makeParser("#else\n")
            .should.throw(SyntaxError, /^#else without matching #if/);
    });

    it("nested #else without matching #if is an error", function()
    {
        var issues = [];

        makeParser("#if FOO\n#else\n#else\n", null, issues)
            .should.throw(issueHandler.AbortError);

        issues.length.should.equal(2);

        issues[0].should.be.an.instanceof(issueHandler.Error);
        issues[0].message.should.equal("Expected #endif, saw #else");

        issues[1].should.be.an.instanceof(issueHandler.Note);
        issues[1].message.should.equal("Matching #if is here:");
    });

    it("#elif without matching #if is an error", function()
    {
        makeParser("#elif FOO\n")
            .should.throw(SyntaxError, /^#elif without matching #if/);
    });

    it("nested #elif without matching #if is an error", function()
    {
        var issues = [];

        makeParser("#if FOO\n#else\n#elif BAR\n", null, issues)
            .should.throw(issueHandler.AbortError);

        issues.length.should.equal(2);

        issues[0].should.be.an.instanceof(issueHandler.Error);
        issues[0].message.should.equal("Expected #endif, saw #elif");

        issues[1].should.be.an.instanceof(issueHandler.Note);
        issues[1].message.should.equal("Matching #if is here:");
    });

    it("#endif without matching #if is an error", function()
    {
        makeParser("#endif\n")
            .should.throw(SyntaxError, /^#endif without matching #if/);
    });

    it("#ifdef without a name is an error", function()
    {
        makeParser("#ifdef\n")
            .should.throw(SyntaxError, /^Missing name after #ifdef/);
    });

    it("#ifndef without a name is an error", function()
    {
        makeParser("#ifndef\n")
            .should.throw(SyntaxError, /^Missing name after #ifndef/);
    });

    it("#ifdef expression not terminated by EOL is an error", function()
    {
        makeParser("#ifdef FOO BAR\n")
            .should.throw(SyntaxError, /^#ifdef expressions must be followed by EOL/);
    });

    it("#ifndef expression not terminated by EOL is an error", function()
    {
        makeParser("#ifndef FOO BAR\n")
            .should.throw(SyntaxError, /^#ifndef expressions must be followed by EOL/);
    });

    it("#else not followed by EOL is an error", function()
    {
        makeParser("#if FOO\n#else BAR\n#endif\n")
            .should.throw(SyntaxError, /^#else must be followed by EOL/);
    });

    it("#endif not followed by EOL is an error", function()
    {
        makeParser("#if FOO\n#endif BAR\n")
            .should.throw(SyntaxError, /^#endif must be followed by EOL/);
    });

    it("floating point literal in a preprocessor expression is an error", function()
    {
        makeParser("#if 7.27\n#endif\n")
            .should.throw(SyntaxError, /^Non-integer number in preprocesor expression/);
    });

    it("scientific literal in a preprocessor expression is an error", function()
    {
        makeParser("#if 7e13\n#endif\n")
            .should.throw(SyntaxError, /^Non-integer number in preprocesor expression/);
    });

    it("invalid #if expression operator is an error", function()
    {
        makeParser("#if 1 = 1\n#endif\n")
            .should.throw(SyntaxError, /^Token is not a valid binary operator in a preprocessor subexpression/);
    });

    it("invalid #elif expression operator is an error", function()
    {
        makeParser("#if 0\n#elif 1 = 1\n#endif\n")
            .should.throw(SyntaxError, /^Token is not a valid binary operator in a preprocessor subexpression/);
    });

    it("unclosed parenthetical expression is an error", function()
    {
        makeParser("#if (27\n#endif\n")
            .should.throw(SyntaxError, /^Expected '\)' in preprocessor expression/);
    });

    it("invalid expression token is an error", function()
    {
        makeParser("#if [foo]\n#endif\n")
            .should.throw(SyntaxError, /^Invalid preprocessor expression token/);
    });

    it("'defined' without a name is an error", function()
    {
        makeParser("#if defined\n#endif\n")
            .should.throw(SyntaxError, /^Macro name missing/);
    });

    it("'defined()' without a closing parens is an error", function()
    {
        makeParser("#if defined(foo\n#endif\n")
            .should.throw(SyntaxError, /^Expected '\)' after macro name/);
    });
});
