"use strict";

var acorn = require("acorn"),
    makeParser = require("../lib/test-utils").makeParser;

/* global describe, it */

// jscs: disable maximumLineLength

describe("Predefined macros", function()
{
    it("__CAPPUCCINO__ should always be 1", function()
    {
        var ast = makeParser("__CAPPUCCINO__;")();

        ast.should.be.an.instanceof(acorn.Node);
        ast.body[0].expression.value.should.equal(1);
    });

    it("__PLATFORM__ should be the current platform ('" + process.platform + "')", function()
    {
        var ast = makeParser("__PLATFORM__;")();

        ast.should.be.an.instanceof(acorn.Node);
        ast.body[0].expression.value.should.equal(process.platform);
    });

    it("__NODE__ should be the current node version ('" + process.version + "')", function()
    {
        var ast = makeParser("__NODE__;")();

        ast.should.be.an.instanceof(acorn.Node);
        ast.body[0].expression.value.should.equal(process.version);
    });

    it("__OBJJ__ should be 1 when Objective-J is active", function()
    {
        var ast = makeParser("__OBJJ__;")();

        ast.should.be.an.instanceof(acorn.Node);
        ast.body[0].expression.value.should.equal(1);
    });

    it("__OBJJ__ should be undefined when Objective-J is inactive", function()
    {
        var ast = makeParser("__OBJJ__;", { objjOptions: { objj: false }})();

        ast.should.be.an.instanceof(acorn.Node);

        var node = ast.body[0].expression;

        node.type.should.equal("Identifier");
        node.name.should.equal("__OBJJ__");
    });

    it("__ECMA_VERSION__ should be the numeric ECMA version given to the parser", function()
    {
        var ast = makeParser("__ECMA_VERSION__;", { ecmaVersion: 5 })();

        ast.should.be.an.instanceof(acorn.Node);
        ast.body[0].expression.value.should.equal(5);

        ast = makeParser("__ECMA_VERSION__;", { ecmaVersion: 6 })();

        ast.should.be.an.instanceof(acorn.Node);
        ast.body[0].expression.value.should.equal(6);
    });
});
