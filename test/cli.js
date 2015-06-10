"use strict";

var chai = require("chai"),
    cli = require("../lib/cli"),
    fs = require("fs"),
    path = require("path"),
    run = require("./lib/test-utils").run,
    util = require("util");

chai.should();
require("./lib/chai");

/* global before, describe, it */

describe("cli", function()
{
    var dir = "test/fixtures/cli",
        executable;

    before(function()
    {
        executable = cli.getEnvironment().executable;
    });

    it("should generate an error if there is #! without --allow-hash-bang", function()
    {
        var result = run([path.join(dir, "hash-bang.js")]);

        result.output.should.equal(executable + ": error: Unexpected character '#' (1:0)\n");
        result.exitCode.should.equal(1);
    });

    it("should not generate an error if there is #! with --allow-hash-bang", function()
    {
        run(["--allow-hash-bang", path.join(dir, "hash-bang.js")]).output
            .should.equalFixture("cli/hash-bang.json", "hash-bang.js");
    });

    it("should generate pretty-printed JSON by default", function()
    {
        run([path.join(dir, "compact.js")]).output
            .should.equalFixture("cli/pretty.json", "compact.js");
    });

    it("should generate compact JSON with --compact", function()
    {
        run(["--compact", path.join(dir, "compact.js")]).output
            .should.equalFixture("cli/compact.json");
    });

    it("should not parse ECMAScript 6 by default", function()
    {
        var result = run([path.join(dir, "ecma.js")]);

        result.output.should.equal(executable + ": error: Unexpected token (1:4)\n");
        result.exitCode.should.equal(1);
    });

    it("should parse EMCAScript 6 with --ecma 6", function()
    {
        run(["--ecma", "6", path.join(dir, "ecma.js")]).output
            .should.equalFixture("cli/ecma.json");
    });

    it("should show help with --help", function()
    {
        var prefix = util.format(
            "%s \nUsage: %s [options] file\n\nParses a file and outputs an AST.",
            cli.getVersionString(),
            executable
        );

        run(["--help"]).output.indexOf(prefix).should.equal(0);
    });

    it("should generate location data with --locations", function()
    {
        run(["--locations", path.join(dir, "compact.js")]).output
            .should.equalFixture("cli/locations.json");
    });

    it("should not generate any output with --silent", function()
    {
        var result = run(["--silent", path.join(dir, "compact.js")]);

        /* eslint-disable no-unused-expressions */
        result.exitCode.should.equal(0);
        result.output.should.be.empty;

        result = run(["--silent", path.join(dir, "ecma.js")]);

        result.exitCode.should.equal(1);
        result.output.should.be.empty;
    });

    it("should generate an error for missing semicolons with --strict-semicolons", function()
    {
        var result = run(["--strict-semicolons", path.join(dir, "compact.js")]);

        result.output.should.equal(executable + ": error: Expected a semicolon (1:10)\n");
        result.exitCode.should.equal(1);
    });

    it("should show the executable name, version and acorn version with --version", function()
    {
        run(["--version"]).output.should.equal(cli.getVersionString() + "\n");
    });

    it("should generate an error if no input file is given", function()
    {
        var result = run([]);

        result.output.should.equal(executable + ": error: No input file\n");
        result.exitCode.should.equal(1);
    });

    it("should generate an error if more than one input file is given", function()
    {
        var result = run(["foo.js", "bar.js"]);

        result.output.should.equal(executable + ": error: Only one file may be parsed at a time\n");
        result.exitCode.should.equal(1);
    });

    it("should read from stdin if the input file is '-'", function()
    {
        var fd = fs.openSync(path.join(dir, "compact.js"), "r"),
            stream = fs.createReadStream("", { fd: fd });

        run(["-"], { stdin: stream }).output
            .should.equalFixture("cli/pretty.json", "compact.js");
    });

    it("should define macros passed with --macro", function()
    {
        // TODO: regenerate fixture when macros are implemented
        run(["--macro", "FOO", path.join(dir, "macro1.js")]).output
            .should.equalFixture("cli/macro1.json");

        run(["--macro", "[FOO, BAR=7]", path.join(dir, "macro2.js")]).output
            .should.equalFixture("cli/macro2.json");
    });
});
