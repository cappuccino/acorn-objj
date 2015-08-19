"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var testFixture = utils.testFixture,
    baseDir = "Implementation details/";

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Implementation", function()
{
    it("directives may be on the first line", function()
    {
        testFixture("preprocessor", baseDir + "first-line");
    });

    it("macros may be called on the last line", function()
    {
        testFixture("preprocessor", baseDir + "last-line");
    });

    it("tokens that have a TokContext override should work with macros", function()
    {
        testFixture("preprocessor", baseDir + "token-context");
    });

    it("macros defined during parsing will be added to macroList if passed to parse()", function()
    {
        var macroList = [],
            options = { objjOptions: { macroList: macroList } }

        utils.makeParser("#define FOO 7\n#define foo(arg1, arg2) (arg1) + (arg2)\n", options)();

        macroList.length.should.equal(2);
        macroList[0].should.equal("FOO=7");
        macroList[1].should.equal("foo(arg1, arg2)=(arg1) + (arg2)");
    });
});
