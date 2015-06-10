"use strict";

var stripColor = require("chalk").stripColor,
    cli = require("../../lib/cli");

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
