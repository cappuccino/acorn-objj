"use strict";

var chai = require("chai"),
    fs = require("fs"),
    path = require("path"),
    parse = require("../lib/parse"),
    utils = require("./lib/test-utils");

chai.should();
require("./lib/chai");

/* global describe, it */
/* eslint max-nested-callbacks:0 */

// jscs: disable maximumLineLength

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

describe("Objective-J plugin", function()
{
    var dirs = fs.readdirSync("test/objj");

    dirs.forEach(function(d)
    {
        if (/^.+\.js$/.test(d))
            require(path.resolve(path.join("test/objj", d)));
    });
});
