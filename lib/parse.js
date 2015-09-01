"use strict";

var acorn = require("acorn"),
    fs = require("fs");

// jscs: disable requireMultipleVarDecl

var objjDefaultOptions = {
        macros: [],
        macroPrefix: "",
        objj: true,
        preprocessor: true
    };

// jscs: enable

function initOptions(options)
{
    var objjOptions = options || {},
        defaults = Object.keys(objjDefaultOptions);

    for (var i = 0; i < defaults.length; ++i)
    {
        var key = defaults[i];

        if (objjOptions[key] === undefined)
            objjOptions[key] = objjDefaultOptions[key];
    }

    return objjOptions;
}

function expectedSemicolon(offset)
{
    var parser = require("./objj.js").parser;

    parser.raise(offset, "Expected a semicolon");
}

exports.parse = function(source, options, issues)
{
    options = options || {};
    issues = issues || [];

    // Don't bother setting up the plugin if Objective-J and the preprocessor are off
    var objjOptions = initOptions(options.objjOptions);

    if (options.strictSemicolons === true)
    {
        options.onInsertedSemicolon = expectedSemicolon;
        delete options.strictSemicolons;
    }

    if (objjOptions.objj === true || objjOptions.preprocessor === true)
    {
        objjOptions.issues = issues;
        objjOptions.file = options.file || "<unknown>";

        var objj = require("./objj.js");

        acorn.plugins.objj = objj.init;

        // acorn removes all but its own options in parse().
        // To maintain objj options, they are attached to the plugin object.
        options.plugins = options.plugins || {};
        options.plugins.objj = objjOptions;
    }

    return acorn.parse(source, options);
};

exports.parseFile = function(file, options, issues)
{
    options = options || {};
    options.file = file;

    return exports.parse(fs.readFileSync(file, { encoding: "utf8" }), options, issues);
};

exports.parseFileToString = function(file, options, issues)
{
    var ast = exports.parseFile(file, options, issues);

    return JSON.stringify(ast, null, 2) + "\n";
};
