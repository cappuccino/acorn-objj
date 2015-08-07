"use strict";

var chai = require("chai"),
    testFixture = require("../lib/test-utils").testFixture;

/* global describe, it */

describe("@ strings", function()
{
    it("should generate Literal string nodes", function()
    {
        testFixture("objj", "string");
    });
});
