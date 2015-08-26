"use strict";

/**
 * A macro object. Note that a macro can have no parameters but still
 * be a function macro if it is defined with an empty parameter list.
 *
 * @class
 * @param {PreprocessorToken} nameToken - The token that defines the macro's name.
 * @param {string} file - The path (virtual or real) to the macro's source code. Is not checked.
 * @param {boolean} isFunction
 * @param {boolean} isVariadic
 * @param {object[]} parameters - The macro's parameters in order of declaration.
 * @param {object} parameterMap - Maps parameter names to parameter objects.
 * @param {PreprocessorToken[]} tokens - The macro's body tokens.
 */
var Macro = function(
    nameToken,
    file,
    isFunction,
    isVariadic,
    parameters,
    parameterMap,
    tokens)
{
    this.nameToken = nameToken;
    this.file = file;
    this.isFunction = isFunction;
    this.isVariadic = isVariadic;

    // Tell the parameter its index, so when we lookup a parameter by name, we know its positional index
    for (var i = 0; i < parameters.length; ++i)
        parameters[i].index = i;

    this.parameters = parameters;
    this.parameterMap = parameterMap;
    this.tokens = tokens;
};

Macro.prototype =
{
    getParameterByName: function(name)
    {
        return this.parameterMap[name];
    },

    get name()
    {
        return this.nameToken.value;
    },

    get declaration()
    {
        var end;

        if (this.tokens.length > 0)
            end = this.tokens[0].start;
        else if (this.parameters.length > 0)
            end = this.parameters.last().end;
        else
            end = this.nameToken.end;

        return this.nameToken.input.substring(this.nameToken.start, end).trim();
    },

    get body()
    {
        if (this.tokens.length > 0)
        {
            var start = this.tokens[0].start,
                end = this.tokens.last().end;

            return this.tokens[0].input.substring(start, end).trim();
        }

        return "";
    }
};

module.exports = Macro;
