"use strict";

var acorn = require("acorn"),
    ppState = require("./preprocessor.js").state;

acorn.Parser.prototype.objj_resetParser = function()
{
    // Create a vanilla Parser and copy its state except for plugins
    var plugins = this.options.plugins;

    this.options.plugins = {};

    var parser = new acorn.Parser(this.options, ""),
        pp = this.objj.preprocessor;

    this.options.plugins = plugins;
    parser.input = pp.source;
    this.objj_setToken(parser);

    pp.state = ppState.default;
    pp.firstTokenOnLine = true;
};

acorn.Parser.prototype.objj_finishNode = function(next, node, type)
{
    next.call(this, node, type);

    // If this node was made from the last macro token,
    // patch the end to point to the token's end.
    var pp = this.objj.preprocessor;

    if (pp.isLastMacroToken)
    {
        node.end = pp.lastMacroTokenEnd;

        if (this.options.locations)
            node.loc.end = pp.lastMacroTokenEndLoc;

        pp.isLastMacroToken = false;
    }

    return node;
};

acorn.Parser.prototype.objj_callNext = function(next)
{
    return next.call(this);
};
