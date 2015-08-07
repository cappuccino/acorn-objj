"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Type declarations", function()
{
    it("@class should generate objj_ClassStatement nodes", function()
    {
        testFixture("objj", "type-declarations/@class");
    });

    it("@global should generate objj_GlobalStatement nodes", function()
    {
        testFixture("objj", "type-declarations/@global");
    });

    it("@typedef should generate objj_TypeDefStatement nodes", function()
    {
        testFixture("objj", "type-declarations/@typedef");
    });
});
