"use strict";

var cli = require("../lib/cli"),
    fs = require("fs"),
    path = require("path"),
    run = require("./lib/test-utils").run,
    util = require("util");

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
        var result = run(["--no-preprocessor", "--no-color", path.join(dir, "hash-bang.js")]);

        result.output.should.equalFixture("cli/hash-bang.txt", "hash-bang.js");
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

        result.output.should.equalFixture("cli/ecma.txt", "ecma.js");
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

    it("should fail on Objective-J code with --no-objj", function()
    {
        var result = run(["--no-objj", path.join(dir, "objj.j")]);

        result.output.should.equalFixture("cli/objj.txt", "objj.j");
        result.exitCode.should.equal(1);
    });

    it("should not recognize Objective-J keywords with --no-objj", function()
    {
        run(["--no-objj", path.join(dir, "no-objj.js")]).output
            .should.equalFixture("cli/no-objj.json");
    });

    it("should not load the objj plugin with --no-objj and --no-preprocessor", function()
    {
        run(["--no-objj", "--no-preprocessor", path.join(dir, "no-objj.js")]);
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

        /* eslint-enable */
    });

    it("should generate an error for missing semicolons with --strict-semicolons", function()
    {
        var result = run(["--strict-semicolons", path.join(dir, "strict-semicolons.js")]);

        result.output.should.equalFixture("cli/strict-semicolons.txt", "strict-semicolons.js");
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

    it("should define 'FOO=1' for '--macro FOO'", function()
    {
        run(["--macro", "FOO", path.join(dir, "macro1.js")]).output
            .should.equalFixture("cli/macro1.json");
    });

    it("should define 'FOO=1' and 'BAR=7' for '--macro [FOO, BAR=7]'", function()
    {
        run(["--macro", "[FOO, BAR=7]", path.join(dir, "macro2.js")]).output
            .should.equalFixture("cli/macro2.json");
    });
});
