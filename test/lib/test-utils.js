"use strict";

const
    capture = require("capture-stream"),
    cli = require("../../lib/cli"),
    exists = require("path-exists").sync,
    expect = require("code").expect,
    fs = require("fs"),
    issueHandler = require("acorn-issue-handler"),
    parse = require("../../lib/parse"),
    path = require("path"),
    stripColor = require("chalk").stripColor;

exports.run = function(args, options)
{
    options = options || {};
    options.parseOptions = { slice: 0 };

    const
        restore = capture(process.stdout),
        exitCode = cli.run(args, options),
        output = stripColor(restore(true));

    return { exitCode, output };
};

const fixturesDir = "test/fixtures";

exports.readFixture = function(name)
{
    const
        parsed = path.parse(name),
        filename = parsed.base,
        fixturePath = path.join("test", "fixtures", parsed.dir, filename);

    expect(exists(fixturePath)).to.be.true();

    let fixture = fs.readFileSync(fixturePath, { encoding: "utf8" });

    if (parsed.ext === ".txt" && process.platform === "win32")
        fixture = fixture.replace(/^\s*[^:]+/, match => match.replace(/\//g, "\\"));

    return fixture;
};

exports.testFixture = function(base, file, options)
{
    const
        filePath = path.join(fixturesDir, base, file + ".j"),
        output = parse.parseFileToString(filePath, options),
        fixture = exports.readFixture(path.join(base, file + ".json"));

    expect(output).to.equal(fixture);
};

exports.makeParser = function(source, options, issues)
{
    return () => parse.parse(source, options, issues);
};

/* global describe */

exports.makeDescribes = function(description, filename, isDir)
{
    const dir = isDir ? filename : path.basename(filename, path.extname(filename));

    describe(description, () =>
    {
        const dirs = fs.readdirSync(path.join("test", dir));

        for (let d of dirs)
        {
            if (/^.+\.js$/.test(d))
                require(path.resolve(path.join("test", dir, d)));
        }
    });
};

exports.testIssue = function(issue, severity, message, source, line, column)
{
    let type;

    switch (severity)
    {
        case "error":
        default:
            type = issueHandler.Error;
            break;

        case "warning":
            type = issueHandler.Warning;
            break;

        case "note":
            type = issueHandler.Note;
            break;
    }

    expect(issue).to.be.an.instanceof(type);
    expect(issue.severity).to.equal(severity);
    expect(issue.message).to.equal(message);
    expect(issue.source).to.equal(source);
    expect(issue.lineInfo.line).to.equal(line);
    expect(issue.lineInfo.column).to.equal(column);
};
