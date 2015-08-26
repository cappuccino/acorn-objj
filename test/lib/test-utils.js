"use strict";

var cli = require("../../lib/cli"),
    fs = require("fs"),
    issueHandler = require("acorn-issue-handler"),
    parse = require("../../lib/parse"),
    path = require("path"),
    stripColor = require("chalk").stripColor;

exports.captureStream = function(stream, silent)
{
    var oldWrite = stream.write,
        buffer = "";

    stream.write = function(chunk)
    {
        buffer += chunk.toString(); // chunk is a String or Buffer

        if (!silent)
            oldWrite.apply(stream, arguments);
    };

    return {
        unhook: function unhook()
        {
            stream.write = oldWrite;
        },
        captured: function()
        {
            return buffer;
        }
    };
};

exports.run = function(args, options)
{
    options = options || {};
    options.parseOptions = { slice: 0 };

    var hook = exports.captureStream(process.stdout, true),
        exitCode = cli.run(args, options),
        output = hook.captured();

    hook.unhook();

    return {
        exitCode: exitCode,
        output: stripColor(output)
    };
};

var fixturesDir = "test/fixtures";

exports.testFixture = function(base, file, options)
{
    var filePath = path.join(fixturesDir, base, file + ".j");

    parse.parseFileToString(filePath, options)
        .should.equalFixture(path.join(base, file + ".json"));
};

exports.makeParser = function(source, options, issues)
{
    return function() {
        return parse.parse(source, options, issues);
    };
};

/* global describe */

exports.makeDescribes = function(description, filename, isDir)
{
    var dir = isDir ? filename : path.basename(filename, path.extname(filename));

    describe(description, function()
    {
        var dirs = fs.readdirSync(path.join("test", dir));

        dirs.forEach(function(d)
        {
            if (/^.+\.js$/.test(d))
                require(path.resolve(path.join("test", dir, d)));
        });
    });
};

exports.testIssue = function(issue, severity, message, source, line, column)
{
    var type;

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

    issue.should.be.an.instanceof(type);
    issue.severity.should.equal(severity);
    issue.message.should.equal(message);
    issue.source.should.equal(source);
    issue.lineInfo.line.should.equal(line);
    issue.lineInfo.column.should.equal(column);
};
