"use strict";

var issueHandler = require("acorn-issue-handler"),
    makeParser = require("../lib/test-utils").makeParser;

/* global describe, it */

// jscs: disable maximumLineLength

describe("Diagnostics", function()
{
    it("#warning and #error should generate warnings and errors", function()
    {
        var issues = [];

        makeParser("#warning \"This is a warning\"\n#error \"and this is an error\"\n#warning \"another warning\"\n", null, issues)();

        issues.length.should.equal(3);
        issues[0].should.be.an.instanceof(issueHandler.Warning);

        // Note that the first character of issue messages is lowercased
        issues[0].message.should.equal("This is a warning");

        issues[1].should.be.an.instanceof(issueHandler.Error);
        issues[1].message.should.equal("and this is an error");

        issues[2].should.be.an.instanceof(issueHandler.Warning);
        issues[2].message.should.equal("another warning");
    });
});
