"use strict";

const
    cli = require("../lib/cli"),
    expect = require("code").expect,
    fs = require("fs"),
    path = require("path"),
    utils = require("./lib/test-utils.js");

const  // jscs: ignore requireMultipleVarDecl
    readFixture = utils.readFixture,
    run = utils.run;

describe("cli", () =>
{
    const dir = "test/fixtures/cli";

    let executable;

    before(() => executable = cli.getEnvironment().executable);

    it("should generate an error if the file does not exist", () =>
    {
        const result = run(["--no-color", "foo.j"]);

        expect(result.output).to.match(/^acorn-objj: error: ENOENT: no such file or directory, open '.+'/);
        expect(result.exitCode).to.equal(1);
    });

    it("should generate an error if there is #! without --allow-hash-bang", () =>
    {
        const result = run(["--no-color", path.join(dir, "hash-bang.js")]);

        expect(result.output).to.equal(readFixture("cli/hash-bang.txt", true));
        expect(result.exitCode).to.equal(1);
    });

    it("should generate a stack trace with --stack-trace for thrown Error", () =>
    {
        const result = run(["--no-color", "--stack-trace", "foo.j"]);

        expect(result.output).to.match(/^acorn-objj: error: ENOENT: no such file or directory, open '.+?'\n\nError: ENOENT: no such file or directory, open '.+?'\n\s+at Error \(native\)/);
        expect(result.exitCode).to.equal(1);
    });

    it("should generate a stack trace with --stack-trace for thrown SyntaxError", () =>
    {
        const result = run(["--stack-trace", "--no-color", path.join(dir, "ecma.js")]);

        expect(result.output).to.match(/^(.*\n)+1 error generated\.\n\nSyntaxError: Expected ';' after expression\n\s+at Parser.acorn.Parser.objj_semicolon \(.+?\n/g);
        expect(result.exitCode).to.equal(1);
    });

    it("should not generate an error if there is #! with --allow-hash-bang", () =>
    {
        expect(run(["--allow-hash-bang", path.join(dir, "hash-bang.js")]).output)
            .to.equal(readFixture("cli/hash-bang.json"));
    });

    it("should generate pretty-printed JSON by default", () =>
    {
        expect(run([path.join(dir, "compact.js")]).output)
            .to.equal(readFixture("cli/pretty.json"));
    });

    it("should generate compact JSON with --compact", () =>
    {
        expect(run(["--compact", path.join(dir, "compact.js")]).output)
            .to.equal(readFixture("cli/compact.json"));
    });

    it("should not parse ECMAScript 6 by default", () =>
    {
        const result = run([path.join(dir, "ecma.js")]);

        expect(result.output).to.equal(readFixture("cli/ecma.txt"));
        expect(result.exitCode).to.equal(1);
    });

    it("should parse EMCAScript 6 with --ecma 6", () =>
    {
        expect(run(["--ecma", "6", path.join(dir, "ecma.js")]).output)
            .to.equal(readFixture("cli/ecma.json"));
    });

    it("should show help with --help", () =>
    {
        const prefix =
            `${cli.getVersionString()} \nUsage: ${executable} [options] file\n\nParses a file and outputs an AST.`;

        expect(run(["--help"]).output).to.startWith(prefix);
    });

    it("should generate location data with --locations", () =>
    {
        expect(run(["--locations", path.join(dir, "compact.js")]).output)
            .to.equal(readFixture("cli/locations.json"));
    });

    it("should fail on Objective-J code with --no-objj", () =>
    {
        const result = run(["--no-objj", path.join(dir, "objj.j")]);

        expect(result.output).to.equal(readFixture("cli/objj.txt"));
        expect(result.exitCode).to.equal(1);
    });

    it("should not recognize Objective-J keywords with --no-objj", () =>
    {
        expect(run(["--no-objj", path.join(dir, "no-objj.js")]).output)
            .to.equal(readFixture("cli/no-objj.json"));
    });

    it("should not recognize objj keywords with --no-objj", () =>
    {
        run(["--no-objj", path.join(dir, "no-objj.js")]);
    });

    it("should not generate any output with --silent", () =>
    {
        let result = run(["--silent", path.join(dir, "compact.js")]);

        /* eslint-disable no-unused-expressions */

        expect(result.exitCode).to.equal(0);
        expect(result.output).to.be.empty;

        result = run(["--silent", path.join(dir, "ecma.js")]);

        expect(result.exitCode).to.equal(1);
        expect(result.output).to.be.empty;

        /* eslint-enable */
    });

    it("should generate an error for missing semicolons with --strict-semicolons", () =>
    {
        const result = run(["--strict-semicolons", path.join(dir, "strict-semicolons.js")]);

        expect(result.output).to.equal(readFixture("cli/strict-semicolons.txt"));
        expect(result.exitCode).to.equal(1);
    });

    it("should show the executable name, version and acorn version with --version", () =>
    {
        expect(run(["--version"]).output).to.equal(cli.getVersionString() + "\n");
    });

    it("should generate an error if no input file is given", () =>
    {
        const result = run([]);

        expect(result.output).to.equal("acorn-objj: error: No input file\n");
        expect(result.exitCode).to.equal(1);
    });

    it("should generate an error if more than one input file is given", () =>
    {
        const result = run(["foo.js", "bar.js"]);

        expect(result.output).to.equal("acorn-objj: error: Only one file may be parsed at a time\n");
        expect(result.exitCode).to.equal(1);
    });

    it("should read from stdin if the input file is '-'", () =>
    {
        const fd = fs.openSync(path.join(dir, "compact.js"), "r"),
            stream = fs.createReadStream("", { fd });

        expect(run(["-"], { stdin: stream }).output)
            .to.equal(readFixture("cli/pretty.json"));
    });
});
