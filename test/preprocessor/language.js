"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Parser", function()
{
    it("should allow comments anywhere within a macro", function()
    {
        testFixture("preprocessor", "1.4 The preprocessing language/comments");
    });

    it("should allow directives to be indented", function()
    {
        testFixture("preprocessor", "1.4 The preprocessing language/indented");
    });

    it("should allow whitespace between # and directives", function()
    {
        testFixture("preprocessor", "1.4 The preprocessing language/whitespace");
    });
});
