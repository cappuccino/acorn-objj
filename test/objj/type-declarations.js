"use strict";

var chai = require("chai"),
    utils = require("../lib/test-utils");

chai.should();

var testFixture = utils.testFixture;

/* global describe, it */
/* eslint max-nested-callbacks:0 */

// jscs: disable maximumLineLength

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
