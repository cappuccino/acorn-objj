"use strict";

var chalk = require("chalk"),
    fs = require("fs");

// Designed for use with process.stdin, but works with any ReadStream.
// From http://stackoverflow.com/a/16048083
exports.readStreamSync = function(stream)
{
    var BUFSIZE = 1024 * 8,
        buffer = new Buffer(BUFSIZE),
        text = "",
        bytesRead;

    stream.setEncoding("utf8");

    // Loop as long as stdin input is available
    while (true)
    {
        bytesRead = 0;

        try
        {
            bytesRead = fs.readSync(stream.fd, buffer, 0, BUFSIZE);
        }
        catch (ex)
        {
            /* istanbul ignore next: no way to test this */
            if (ex.code === "EAGAIN")
            {
                // 'resource temporarily unavailable'
                // Happens on OS X 10.8.3 (not Windows 7!), if there's no
                // stdin input - typically when invoking a script without any
                // input (for interactive stdin input).
                // If you were to just continue, you'd create a tight loop.
                throw new Error("interactive stdin input not supported.");
            }
            else if (ex.code === "EOF")
            {
                // Happens on Windows 7, but not OS X 10.8.3:
                // simply signals the end of *piped* stdin input.
                break;
            }

            /* istanbul ignore next: no way to test this */
            throw ex; // Unexpected exception
        }

        if (bytesRead === 0)
        {
            // No more stdin input available.
            // OS X 10.8.3: regardless of input method, this is how the end
            //   of input is signaled.
            // Windows 7: this is how the end of input is signaled for
            //   *interactive* stdin input.
            break;
        }

        // Process the chunk read.
        text += buffer.toString(null, 0, bytesRead);
    }

    return text;
};

exports.colorizeOptions = function(text)
{
    return text.replace(
        /(^|\s)--?\w[\w-]*/g, function(match)
        {
            return chalk.yellow(match);
        }
    ).replace(
        /( - )(default: .+)/g, function(match, sub1, sub2)
        {
            return sub1 + chalk.green(sub2);
        }
    );
};

exports.failWithMessage = function(message)
{
    throw new Error(exports.colorizeOptions(message));
};
