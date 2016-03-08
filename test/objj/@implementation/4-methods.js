"use strict";

const
    expect = require("code").expect,
    utils = require("../../lib/test-utils");

const  // jscs: ignore requireMultipleVarDecl
    makeParser = utils.makeParser,
    testFixture = utils.testFixture;

/* eslint-disable max-len */

describe("methods", () =>
{
    it("should generate objj_MethodDeclaration node with methodType:\"+\" for class methods", () =>
    {
        testFixture("objj", "@implementation/methods/class-method");
    });

    it("should generate methodType:\"-\" for instance methods", () =>
    {
        testFixture("objj", "@implementation/methods/instance-method");
    });

    it("should generate selectors array of Identifiers and args array of Identifier/objj_ObjectiveJType nodes", () =>
    {
        testFixture("objj", "@implementation/methods/selectors-args");
    });

    it("should generate no returnType attribute if no return type is declared", () =>
    {
        testFixture("objj", "@implementation/methods/no-returnType");
    });

    it("should generate action attribute if return type is @action or IBAction", () =>
    {
        testFixture("objj", "@implementation/methods/action");
    });

    it("should generate action *and* returnType attributes if return type is @action or IBAction followed by a type", () =>
    {
        testFixture("objj", "@implementation/methods/action-type");
    });

    it("should generate a null selectors element for empty selectors", () =>
    {
        testFixture("objj", "@implementation/methods/empty-selector");
    });

    it("should generate an args element with no type attribute for missing types", () =>
    {
        testFixture("objj", "@implementation/methods/no-type");
    });

    it("should generate varArgs:true attribute for method signature ending with \", ...\"", () =>
    {
        testFixture("objj", "@implementation/methods/varargs");
    });

    it("should generate an error for missing ... after ,", () =>
    {
        expect(makeParser("@implementation Foo\n- (void)foo:(int)f,\n@end"))
            .to.throw(SyntaxError, /Expected '...' after ','/);
    });
});
