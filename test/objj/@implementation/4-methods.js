"use strict";

var utils = require("../../lib/test-utils");

// jscs: disable requireMultipleVarDecl

var makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* global describe, it */

// jscs: enable
// jscs: disable maximumLineLength

describe("methods", function()
{
    it("should generate objj_MethodDeclaration node with methodType:\"+\" for class methods", function()
    {
        testFixture("objj", "@implementation/methods/class-method");
    });

    it("should generate methodType:\"-\" for instance methods", function()
    {
        testFixture("objj", "@implementation/methods/instance-method");
    });

    it("should generate selectors array of Identifiers and args array of Identifier/objj_ObjectiveJType nodes", function()
    {
        testFixture("objj", "@implementation/methods/selectors-args");
    });

    it("should generate no returnType attribute if no return type is declared", function()
    {
        testFixture("objj", "@implementation/methods/no-returnType");
    });

    it("should generate action attribute if return type is @action or IBAction", function()
    {
        testFixture("objj", "@implementation/methods/action");
    });

    it("should generate action *and* returnType attributes if return type is @action or IBAction followed by a type", function()
    {
        testFixture("objj", "@implementation/methods/action-type");
    });

    it("should generate a null selectors element for empty selectors", function()
    {
        testFixture("objj", "@implementation/methods/empty-selector");
    });

    it("should generate an args element with no type attribute for missing types", function()
    {
        testFixture("objj", "@implementation/methods/no-type");
    });

    it("should generate varArgs:true attribute for method signature ending with \", ...\"", function()
    {
        testFixture("objj", "@implementation/methods/varargs");
    });

    it("should generate an error for missing ... after ,", function()
    {
        makeParser("@implementation Foo\n- (void)foo:(int)f,\n@end")
            .should.throw(SyntaxError, /Expected '...' after ','/);
    });
});
