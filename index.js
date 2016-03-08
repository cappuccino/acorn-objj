"use strict";

exports.cli = require("./lib/cli.js");
exports.initOptions = exports.cli.initOptions;
exports.acornOptionDefinitions = exports.cli.acornOptionDefinitions;
exports.parse = require("./lib/parse.js");
exports.utils = require("./lib/utils.js");

/*
    The following acorn.Parser methods were partially or completely overridden
    and need to be checked in the future for changes to the upstream code:

    readWord
    expect  (no longer calls unexpected)
    expectContextual  (no longer calls unexpected)
    parseExprAtom - tt.bracketL case

    If other plugins want to override these methods, they will need to
    plan accordingly.
*/
