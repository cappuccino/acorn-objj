"use strict";

var acorn = require("acorn"),
    fs = require("fs"),
    objj = require("./objj");

exports.parse = function(source, options)
{
    acorn.plugins.objj = objj;
    options = options || {};
    options.plugins = options.plugins || {};
    options.plugins.objj = true;

    return acorn.parse(source, options);
};

exports.parseFile = function(file, options)
{
    return exports.parse(fs.readFileSync(file, { encoding: "utf8" }), options);
};

exports.parseFileToString = function(file, options)
{
    var ast = exports.parseFile(file, options);

    return JSON.stringify(ast, null, 2) + "\n";
};
