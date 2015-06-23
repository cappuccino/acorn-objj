"use strict";

var chai = require("chai"),
    fs = require("fs"),
    path = require("path");

chai.should();
require("./lib/chai");

/* global describe */

describe("Objective-J plugin", function()
{
    var dirs = fs.readdirSync("test/objj");

    dirs.forEach(function(d)
    {
        if (/^.+\.js$/.test(d))
            require(path.resolve(path.join("test/objj", d)));
    });
});
