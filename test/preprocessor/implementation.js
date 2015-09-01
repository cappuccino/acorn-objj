"use strict";

var utils = require("../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var dir = "Implementation details/",
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("Implementation", function()
{
    it("directives may be on the first line", function()
    {
        testFixture("preprocessor", dir + "first-line");
    });

    it("macros may be called on the last line", function()
    {
        testFixture("preprocessor", dir + "last-line");
    });

    it("tokens that have a TokContext override should work with macros", function()
    {
        testFixture("preprocessor", dir + "token-context");
    });

    it("macros defined during parsing will be added to macroList if passed to parse()", function()
    {
        var macroList = [],
            options = { objjOptions: { macroList: macroList } };

        utils.makeParser(
            "#define    FOO\n" +
            "#define  BAR    7\n" +
            "#define foo(  arg1  ,arg2 )\n" +
            "#define bar(  arg1  ,arg2 )        (   arg1  ) +(arg2  )\n",
            options
        )();

        macroList.length.should.equal(4);
        macroList[0].should.equal("FOO=");
        macroList[1].should.equal("BAR=7");
        macroList[2].should.equal("foo(arg1  ,arg2)=");
        macroList[3].should.equal("bar(arg1  ,arg2)=(   arg1  ) +(arg2  )");
    });
});
