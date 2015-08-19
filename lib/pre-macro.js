"use strict";

// A macro object. Note that a macro can have no parameters but still
// be a function macro if it is defined with an empty parameter list.
var Macro = function(name, start, declaration, parameters, parameterMap, isFunction, isVariadic, body, tokens)
{
    this.name = name;
    this.start = start;
    this.declaration = declaration;

    // Tell the parameter its index, so when we lookup a parameter by name, we know its positional index
    for (var i = 0; i < parameters.length; ++i)
        parameters[i].index = i;

    this.parameters = parameters;
    this.parameterMap = parameterMap;
    this.isFunction = isFunction;
    this.isVariadic = isVariadic;
    this.body = body;
    this.tokens = tokens;
};

Macro.prototype.getParameterByName = function(name)
{
    return this.parameterMap[name];
};

module.exports = Macro;
