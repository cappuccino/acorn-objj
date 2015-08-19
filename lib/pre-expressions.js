"use strict";

var acorn = require("acorn"),
    Preprocessor = require("./preprocessor.js"),
    walk = require("acorn/dist/walk.js");

// jscs: disable requireMultipleVarDecl

var tt = acorn.tokTypes;

// jscs: enable

/*
    Preprocessor expression parser. The GCC docs state that the expression is of integer
    (which in C is also boolean) type and may contain:

    - Integer constants.

    - Arithmetic operators for addition, subtraction, multiplication, division, modulo,
      bitwise operations, bit shifts, comparisons, and logical operations (&& and ||).
      The latter two obey the usual short-circuiting rules of standard C. Note that
      both == and === are accepted, but since all values are converted to numbers,
      they are effectively the same.

    - Unary +, -, !, ~.

    - Macros. All macros in the expression are expanded before actual computation
      of the expression's value begins.

    - Uses of the `defined` operator, which lets you check whether macros are defined
      in the middle of an expression.

    - Identifiers that are not macros, which are all considered to be the number zero.
      This allows you to write #if MACRO instead of #ifdef MACRO, if you know that MACRO,
      when defined, will always have a nonzero value. Function-like macros used without
      their function call parentheses are also treated as zero.

    - Boolean values resolve to 1 for true and 0 for false.

    We extend this syntax to allow:

    - String literals, which resolve to Number(value).

    The functions below are analogous to their parseX equivalents, but with the
    syntax restrictions mentioned above.
*/

acorn.Parser.prototype.objj_parsePreprocessExpression = function()
{
    var pp = this.objj.preprocessor;

    // When parsing the expression, we want macro expansion
    pp.state |= Preprocessor.state.expandMacros;

    // We don't want comment tracking during expression parsing
    var onComment = this.options.onComment;

    this.options.onComment = null;
    this.next();

    var expr = this.objj_preprocessParseExpression();

    this.options.onComment = onComment;
    pp.state &= ~Preprocessor.state.expandMacros;

    return expr;
};

acorn.Parser.prototype.objj_preprocessParseExpression = function()
{
    return this.objj_preprocessParseExprOps();
};

acorn.Parser.prototype.objj_preprocessParseExprOps = function()
{
    return this.objj_preprocessParseExprOp(this.objj_preprocessParseMaybeUnary(), -1);
};

acorn.Parser.prototype.objj_preprocessParseExprOp = function(left, minPrec)
{
    var valid = false;

    if (this.type.prefix || this.type.binop)
    {
        // If it's an operator, make sure it's allowed
        valid = this.objj_isPreprocessorToken(this.type);

        var prec = this.type.binop;

        if (valid && prec && prec > minPrec)
        {
            var node = this.startNodeAt(left.start, left.startLoc),
                op = this.type;

            node.left = left;
            node.operator = this.value;
            this.next();
            node.right = this.objj_preprocessParseExprOp(this.objj_preprocessParseMaybeUnary(), prec);
            this.finishNode(
                node,
                (op === tt.logicalAND || op === tt.logicalOR) ? "LogicalExpression" : "BinaryExpression"
            );

            return this.objj_preprocessParseExprOp(node, minPrec);
        }
    }
    else
        valid = this.type === tt.objj_eol || this.type === tt.parenR;

    if (!valid)
        this.raise(this.start, "Token is not a valid binary operator in a preprocessor subexpression");

    return left;
};

acorn.Parser.prototype.objj_preprocessParseMaybeUnary = function()
{
    if (this.objj_isPreprocessorToken(this.type) && this.type.prefix)
    {
        var node = this.startNode();

        node.operator = this.value;
        node.prefix = true;
        this.next();
        node.argument = this.objj_preprocessParseMaybeUnary();

        return this.finishNode(node, "UnaryExpression");
    }

    return this.objj_preprocessParseExprAtom();
};

acorn.Parser.prototype.objj_preprocessParseExprAtom = function()
{
    var pp = this.objj.preprocessor,
        isIdentifier = false,
        node;

    switch (this.type)
    {
        // We have to temporarily turn macro expansion off when we call parseIdent(),
        // because it does next(), and if the name is "defined", the name after that
        // should be a macro, and we don't want that to be expanded.
        case tt.name:
            pp.state &= ~Preprocessor.state.expandMacros;
            node = this.parseIdent();

            if (node.name === "defined")
                node = this.objj_preprocessParseDefined(node);
            else
                isIdentifier = true;

            // We can resume macro expansion now
            pp.state |= Preprocessor.state.expandMacros;
            break;

        // Only integer values are allowed
        case tt.num:
            if (/^\d+$/.test(this.input.substring(this.start, this.end)))
                node = this.parseLiteral(this.value);
            else
                this.raise(this.start, "Non-integer number in preprocesor expression");
            break;

        case tt.string:
            node = this.parseLiteral(this.value);
            break;

        case tt._true:
        case tt._false:
            node = this.startNode();
            node.value = this.type === tt._true;
            this.next();

            return this.finishNode(node, "Literal");

        case tt.parenL:
            var start = this.start;

            this.next();
            node = this.objj_preprocessParseExpression();
            node.start = start;
            node.end = this.end;
            this.objj_expect(tt.parenR, "Expected ')' in preprocessor expression");
            break;

        default:
            if (this.type.keyword)
            {
                // Keywords are treated as identifiers
                isIdentifier = true;
                node = this.startNode();
                this.next();
            }
            else
                this.raise(this.start, "Invalid preprocessor expression token");
    }

    if (isIdentifier)
    {
        // All identifiers are considered 0
        node.value = 0;
        this.finishNode(node, "Literal");
    }

    return node;
};

acorn.Parser.prototype.objj_preprocessParseDefined = function(node)
{
    var newNode = this.startNodeAt(node.start, node.startLoc),
        haveParens = this.type === tt.parenL;

    if (haveParens)
        this.next();

    if (this.type !== tt.name)
        this.raise(this.start, "Macro name missing");

    newNode.name = this.value;
    this.next();

    if (haveParens)
        this.objj_expect(tt.parenR, "Missing ')' after macro name");

    return this.finishNode(newNode, "objj_DefinedExpression");
};

function visit(visitor, node, state)
{
    var visitorState = { parser: state.parser, value: state.value };

    visitor(node, visitorState);

    return visitorState.value;
}

// noinspection JSConstructorReturnsPrimitive
/* eslint-disable eqeqeq */

acorn.Parser.prototype.objj_preprocessEvalExpression = function(expr)
{
    var walkState = {
            parser: this,
            value: null
        };

    walk.recursive(expr, walkState, {
        UnaryExpression: function(node, state, visitor)
        {
            switch (node.operator)
            {
                case "-":
                    state.value = -visit(visitor, node.argument, state);
                    break;

                case "+":
                    state.value = +visit(visitor, node.argument, state);
                    break;

                case "!":
                    state.value = Number(!visit(visitor, node.argument, state));
                    break;

                case "~":
                    state.value = ~visit(visitor, node.argument, state);
                    break;

                /* istanbul ignore next */
                default:
                    state.value = 0;
            }
        },

        BinaryExpression: function(node, state, visitor)
        {
            var left = node.left,
                right = node.right;

            switch (node.operator)
            {
                case "+":
                    state.value = visit(visitor, left, state) + visit(visitor, right, state);
                    break;

                case "-":
                    state.value = visit(visitor, left, state) - visit(visitor, right, state);
                    break;

                case "*":
                    state.value = visit(visitor, left, state) * visit(visitor, right, state);
                    break;

                case "/":
                    state.value = Math.trunc(visit(visitor, left, state) / visit(visitor, right, state));
                    break;

                case "%":
                    state.value = visit(visitor, left, state) % visit(visitor, right, state);
                    break;

                case ">>":
                    state.value = visit(visitor, left, state) >> visit(visitor, right, state);
                    break;

                case ">>>":
                    state.value = visit(visitor, left, state) >>> visit(visitor, right, state);
                    break;

                case "<<":
                    state.value = visit(visitor, left, state) << visit(visitor, right, state);
                    break;

                case "<":
                    state.value = Number(visit(visitor, left, state) < visit(visitor, right, state));
                    break;

                case ">":
                    state.value = Number(visit(visitor, left, state) > visit(visitor, right, state));
                    break;

                case "==":
                case "===":
                    state.value = Number(visit(visitor, left, state) == visit(visitor, right, state));
                    break;

                case "!=":
                case "!==":
                    state.value = Number(visit(visitor, left, state) != visit(visitor, right, state));
                    break;

                case "<=":
                    state.value = Number(visit(visitor, left, state) <= visit(visitor, right, state));
                    break;

                case ">=":
                    state.value = Number(visit(visitor, left, state) >= visit(visitor, right, state));
                    break;

                case "&":
                    state.value = visit(visitor, left, state) & visit(visitor, right, state);
                    break;

                case "|":
                    state.value = visit(visitor, left, state) | visit(visitor, right, state);
                    break;

                case "^":
                    state.value = visit(visitor, left, state) ^ visit(visitor, right, state);
                    break;

                /* istanbul ignore next */
                default:
                    state.value = 0;
            }
        },

        LogicalExpression: function(node, state, visitor)
        {
            var left = node.left,
                right = node.right;

            switch (node.operator)
            {
                case "||":
                    state.value = Number(visit(visitor, left, state) || visit(visitor, right, state));
                    break;

                case "&&":
                    state.value = Number(visit(visitor, left, state) && visit(visitor, right, state));
                    break;

                /* istanbul ignore next */
                default:
                    state.value = 0;
            }
        },

        Literal: function(node, state)
        {
            state.value = Number(node.value);
        },

        objj_DefinedExpression: function(node, state)
        {
            state.value = Number(state.parser.objj.preprocessor.isMacro(node.name));
        }
    });

    return walkState.value;
};

/* eslint-enable */
