"use strict";

var cli = require("../../lib/cli"),
    fs = require("fs"),
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

var fixturesDir = "test/fixtures/objj";

exports.testFixture = function(file, options)
{
    parse.parseFileToString(path.join(fixturesDir, file + ".j"), options)
        .should.equalFixture(path.join("objj", file + ".json"));
};

exports.makeParser = function(source, options)
{
    return function() { parse.parse(source, options); };
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
