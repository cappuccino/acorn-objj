"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Object-like macros", function()
{
    it("should expand their body tokens when they are expanded", function()
    {
        testFixture("preprocessor", "3.1 Object-like Macros/evaluated-when-expanded");
    });

    it("may span multiple lines", function()
    {
        testFixture("preprocessor", "3.1 Object-like Macros/multiple-lines");
    });

    it("should only take effect from the point of definition", function()
    {
        testFixture("preprocessor", "3.1 Object-like Macros/point-of-definition");
    });

    it("may be redefined", function()
    {
        testFixture("preprocessor", "3.1 Object-like Macros/redefined");
    });
});
