"use strict";

var driver = require("./acorn/driver.js"),
    parse = require("../lib/parse.js").parse;

require("./acorn/tests.js");

/* global describe, it */

var mode = {},
    stats = mode.stats = { testsRun: 0, failed: 0 };

function report(state, code)
{
    if (state !== "ok")
    {
        ++stats.failed;
        console.log("\"" + code + "\"");
    }

    ++stats.testsRun;
}

function doParse(source, options)
{
    options.objjOptions = { betterErrors: false };

    return parse(source, options);
}

describe("acorn", function()
{
    it("all standard acorn tests should pass", function()
    {
        driver.runTests({ parse: doParse }, report);
        stats.failed.should.equal(0);
    });
});
