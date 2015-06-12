"use strict";

var chai = require("chai"),
    path = require("path"),
    parse = require("./lib/test-utils").parseFileToString;

chai.should();
require("./lib/chai");

/* global describe, it */

var dir = "test/fixtures/objj";

function test(description, file)
{
    it(description, function()
    {
        parse(path.join(dir, file + ".j"))
            .should.equalFixture(path.join("objj", file + ".json"));
    });
}

describe("Objective-J extensions", function()
{
    var tests = [
        ["should generate objj_ArrayLiteral nodes for @[]", "array-literal"],
        ["should generate objj_DictionaryLiteral nodes for @{}", "dictionary-literal"]
    ];

    tests.forEach(function(info)
    {
        test(info[0], info[1]);
    });
});
