"use strict";

var acorn = require("acorn"),
    fs = require("fs"),
    objj = require("./objj");

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
    // acorn removes all but its own options in parse().
    // To maintain objj options, they are attached to the plugin object.
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

exports.parse = function(source, options)
{
    acorn.plugins.objj = objj;
    options = options || {};
    options.plugins = options.plugins || {};
    options.plugins.objj = initOptions(options.objjOptions);

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
