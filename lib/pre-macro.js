"use strict";

// jscs: disable requireMultipleVarDecl

/**
 * The properties available in Macro objects.
 *
 * @typedef {object} MacroType
 *
 * @property {PreprocessorToken} nameToken
 * @property {string} file
 * @property {boolean} isFunction
 * @property {boolean} isVariadic
 * @property {object[]} parameters - The macro's parameters in order of declaration.
 * @property {object} parameterMap - Maps parameter names to parameter objects.
 * @property {PreprocessorToken[]} tokens - The macro's body tokens.
 * @property {string} name
 * @property {string} input
 * @property {string} declaration
 * @property {string} body
 */

/**
 * A [macro]{@link MacroType} object. Note that a macro can have no parameters but still
 * be a function macro if it is defined with an empty parameter list.
 *
 * @class
 * @param {PreprocessorToken} nameToken - The token that defines the macro's name.
 * @param {string} file - The path (virtual or real) to the macro's source code. Is not checked.
 * @param {boolean} isFunction
 * @param {boolean} isVariadic
 * @param {boolean} expandArgs
 * @param {object[]} parameters - The macro's parameters in order of declaration.
 * @param {object} parameterMap - Maps parameter names to parameter objects.
 * @param {PreprocessorToken[]} tokens - The macro's body tokens.
 */
var Macro = function(
    nameToken,
    file,
    isFunction,
    isVariadic,
    expandArgs,
    parameters,
    parameterMap,
    tokens)
{
    this.nameToken = nameToken;
    this.file = file;
    this.isFunction = isFunction;
    this.isVariadic = isVariadic;
    this.expandArgs = expandArgs;

    // Tell the parameter its index, so when we lookup a parameter by name, we know its positional index
    for (var i = 0; i < parameters.length; ++i)
        parameters[i].index = i;

    this.parameters = parameters;
    this.parameterMap = parameterMap;
    this.tokens = tokens;
};

Macro.prototype =
{
    get name()
    {
        return this.nameToken.value;
    },

    get input()
    {
        return this.nameToken.input;
    },

    get declaration()
    {
        var decl = this.nameToken.value;

        if (this.isFunction)
            decl += "(";

        if (this.parameters.length > 0)
        {
            var start = this.parameters[0].start,
                end = this.parameters.last().end;

            decl += this.nameToken.input.substring(start, end).trim();
        }

        if (this.isFunction)
            decl += ")";

        return decl;
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

exports.Macro = Macro;

/**
 * Properties available in MacroArgument objects.
 *
 * @typedef {MacroArgument} MacroArgumentType
 * @property {Macro} macro
 * @property {string} input - Source code where argument is found.
 * @property {number} start - Start position of argument.
 * @property {number} end - End position of argument.
 * @property {PreprocessorToken[]} tokens - The source tokens that make up this arg.
 * @property {PreprocessorToken[]} expandedTokens - The expanded version of this.tokens.
 */

// jscs: enable
