"use strict";

var chai = require("chai"),
    format = require("util").format,
    fs = require("fs"),
    path = require("path"),
    exists = require("path-exists").sync;

chai.Assertion.addMethod("equalFixture", function(name, source)
{
    var obj = this._obj;

    new chai.Assertion(typeof obj).to.equal("string");

    var parsed = path.parse(name),
        type;

    switch (parsed.ext)
    {
        case ".txt":
            type = "parser errors";
            break;

        default:
            type = "AST";
    }

    var sourceName,
        sourcePath;

    if (source)
        sourceName = source;
    else
    {
        sourceName = parsed.name + ".j";
        sourcePath = path.join("test", "fixtures", parsed.dir, sourceName);

        if (!exists(sourcePath))
            sourceName = parsed.name + ".js";
    }

    sourcePath = path.join("test", "fixtures", parsed.dir, sourceName);

    var filename = parsed.base,
        fixturePath = path.join("test", "fixtures", parsed.dir, filename),
        contents;

    try
    {
        contents = fs.readFileSync(fixturePath, { encoding: "utf8" });
    }
    catch (e)
    {
        var error;

        if (e.code === "ENOENT")
            error = "expected to find the fixture '" + fixturePath + "'";
        else
            error = e.message;

        this.assert(
            false,
            error,
            error,
            null,
            null,
            false
        );
    }

    this.assert(
        obj === contents,
        format("expected %s of %s to match %s", type, sourcePath, fixturePath),
        format("expected %s of %s to not match %s", type, sourcePath, fixturePath),
        obj, // expected
        contents, // actual
        true // show diff
    );
});
