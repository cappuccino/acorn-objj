"use strict";

const
    driver = require("./acorn/driver.js"),
    expect = require("code").expect,
    parse = require("../lib/parse.js").parse;

require("./acorn/tests.js");

let mode = {},
    stats = mode.stats = { testsRun: 0, failed: 0 };

function report(state, code)
{
    if (state !== "ok")
    {
        ++stats.failed;
        console.log(`"${code}"`);
    }

    ++stats.testsRun;
}

function doParse(source, options)
{
    options.objjOptions = { betterErrors: false };

    return parse(source, options);
}

describe("acorn", () =>
{
    it("all standard acorn tests should pass", () =>
    {
        driver.runTests({ parse: doParse }, report);
        expect(stats.failed).to.equal(0);
    });
});
