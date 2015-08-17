"use strict";

// A macro object. Note that a macro can have no parameters but still
// be a function macro if it is defined with an empty parameter list.
var Macro = function(name, nameStart, nameEnd, parameters, parameterMap, isFunction, isVariadic, tokens)
{
    this.name = name;
    this.start = nameStart;
    this.end = nameEnd;

    // Tell the parameter its index, so when we lookup a parameter by name, we know its positional index
    for (var i = 0; i < parameters.length; ++i)
        parameters[i].index = i;

    this.parameters = parameters;
    this.parameterMap = parameterMap;
    this.isFunction = isFunction;
    this.isVariadic = isVariadic;
    this.tokens = tokens;
};

Macro.prototype.isParameter = function(name)
{
    return this.parameterMap[name] !== undefined;
};

Macro.prototype.getParameterByName = function(name)
{
    return this.parameterMap[name];
};

Macro.prototype.getName = function()
{
    return this.name;
};

module.exports = Macro;
