"use strict";

exports.cli = require("./lib/cli.js");
exports.parse = exports.cli.parse;
exports.parseFile = exports.cli.parseFile;
exports.utils = require("./lib/utils.js");

/*
    The following acorn.Parser methods were partially or completely overridden
    and need to be checked in the future for changes to the upstream code:

    parse
    readWord
    readWord1
    skipSpace
*/
