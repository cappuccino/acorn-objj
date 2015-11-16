"use strict";

const testFixture = require("../lib/test-utils").testFixture;

describe("@ strings", () =>
{
    it("should generate Literal string nodes", () =>
    {
        testFixture("objj", "string");
    });
});
