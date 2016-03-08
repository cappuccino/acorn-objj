"use strict";

const
    acorn = require("acorn"),
    fs = require("fs"),
    issueHandler = require("acorn-issue-handler"),
    objj = require("./objj.js");

const objjDefaultOptions = { // jscs: ignore
        objj: true,
        betterErrors: true
    };

function initOptions(options)
{
    let objjOptions = options || {};

    for (let key of Object.keys(objjDefaultOptions))
    {
        if (objjOptions[key] === undefined)
            objjOptions[key] = objjDefaultOptions[key];
    }

    return objjOptions;
}

function objj_expectedSemicolon(offset)
{
    // eslint-disable-next-line no-invalid-this
    this.raise(offset, "Expected a semicolon");
}

exports.parse = function(source, options, issues)
{
    options = options || {};
    issues = issues || new issueHandler.IssueList();

    if (options.strictSemicolons)
    {
        options.onInsertedSemicolon = objj_expectedSemicolon;
        delete options.strictSemicolons;
    }

    let objjOptions = initOptions(options.objjOptions);

    objjOptions.issues = issues;
    objjOptions.file = options.file || "<unknown>";

    acorn.plugins.objj = objj.init;

    // acorn removes all but its own options in parse().
    // To maintain objj options, they are attached to the plugin object.
    options.plugins = options.plugins || {};
    options.plugins.objj = objjOptions;

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
    const ast = exports.parseFile(file, options, issues);

    return JSON.stringify(ast, null, 2) + "\n";
};
