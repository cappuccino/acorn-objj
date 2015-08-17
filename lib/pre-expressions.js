"use strict";

var acorn = require("acorn"),
    Preprocessor = require("./preprocessor");

// jscs: disable requireMultipleVarDecl

var tt = acorn.tokTypes;

// jscs: enable

/*
    #if expression parser. The GCC docs state that the expression is of integer
    (which in C is also boolean) type and may contain:

    - Integer constants.

    - Arithmetic operators for addition, subtraction, multiplication, division,
      bitwise operations, shifts, comparisons, and logical operations (&& and ||).
      The latter two obey the usual short-circuiting rules of standard C.

    - Macros. All macros in the expression are expanded before actual computation
      of the expression's value begins.

    - Uses of the `defined` operator, which lets you check whether macros are defined
      in the middle of an `#if'.

    - Identifiers that are not macros, which are all considered to be the number zero.
      This allows you to write #if MACRO instead of #ifdef MACRO, if you know that MACRO,
      when defined, will always have a nonzero value. Function-like macros used without
      their function call parentheses are also treated as zero.

    We extend this syntax to allow:

    - String literals.

    The functions below are analogous to their parseX equivalents, but with the
    syntax restrictions mentioned above.
*/

acorn.Parser.prototype.objj_parsePreprocessExpression = function()
{
    var pp = this.objj.preprocessor;

    // When parsing the expression, we want macro expansion
    pp.state |= Preprocessor.state.expandMacros;
    this.next();

    var expr = this.objj_preprocessParseExpression();

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
    var prec = this.type.binop;

    if (prec)
    {
        // Only operators marked with a preprocessor attribute are allowed
        if (this.type.preprocess == null)
            this.raise(this.start, "Invalid #if expression operator: '" + this.value + "'");

        if (prec > minPrec)
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

    return left;
};

acorn.Parser.prototype.objj_preprocessParseMaybeUnary = function()
{
    if (this.type.preprocess && this.type.prefix)
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
        node;

    switch (this.type)
    {
        // We have to temporarily turn macro expansion off when we call parseIdent(),
        // because it does next(), and if the name is "defined", the name after that
        // should be a macro, and we don't want that to be expanded.
        case tt.name:
            pp.state &= ~Preprocessor.state.expandMacros;
            node = this.parseIdent();

            if (pp.isMacro(node.name))
            {
                // If we have a name which is a macro name, that means it was a function
                // macro that had no arguments, and it is treated as the literal 0.
                node.type = "Literal";
                node.value = 0;
                node.raw = "0";
            }
            else if (node.name === "defined")
                node = this.objj_preprocessParseDefined(node);
            else if (node.name === "undefined")
                this.raise(node.start, "Invalid #if expression token: '" + node.name + "'");

            // We can resume macro expansion now
            pp.state |= Preprocessor.state.expandMacros;
            break;

        // Only integer values are allowed
        case tt.num:
            if (/^\d+$/.test(this.value.toString()))
                node = this.parseLiteral();
            else
                this.raise(this.start, "Non-integer number in #if expression");
            break;

        case tt.string:
            node = this.parseLiteral();
            break;

        case tt._true:
        case tt._false:
            node = this.startNode();
            node.value = this.type.atomValue;
            node.raw = this.type.keyword;
            this.next();

            return this.finishNode(node, "Literal");

        case tt.parenL:
            var start = this.start;

            this.next();
            node = this.objj_preprocessParseExpression();
            node.start = start;
            node.end = this.end;
            this.objj_expect(tt.parenR, "Expected closing ')' in #if expression");
            break;

        default:
            this.raise(this.start, "Invalid #if expression token: '" + this.value + "'");
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
        this.raise(this.start, "Expected a name following 'defined'");

    newNode.name = this.value;
    this.next();

    if (haveParens)
        this.objj_expect(tt.parenR, "')' expected after macro name");

    return this.finishNode(newNode, "DefinedExpression");
};

/*
acorn.Parser.prototype.objj_preprocessEvalExpression = function(expr)
{
    return walk.recursive(expr, {}, {
        UnaryExpression: function(node, st, c)
        {
            switch (node.operator)
            {
                case "-":
                    return -c(node.argument, st);

                case "+":
                    return +c(node.argument, st);

                case "!":
                    return !c(node.argument, st);

                case "~":
                    return ~c(node.argument, st);
            }
        },

        BinaryExpression: function(node, st, c)
        {
            var left = node.left,
                right = node.right;

            switch (node.operator)
            {
                case "+":
                    return c(left, st) + c(right, st);

                case "-":
                    return c(left, st) - c(right, st);

                case "*":
                    return c(left, st) * c(right, st);

                case "/":
                    return c(left, st) / c(right, st);

                case "%":
                    return c(left, st) % c(right, st);

                case ">>":
                    return c(left, st) >> c(right, st);

                case ">>>":
                    return c(left, st) >>> c(right, st);

                case "<<":
                    return c(left, st) << c(right, st);

                case "<":
                    return c(left, st) < c(right, st);

                case ">":
                    return c(left, st) > c(right, st);

                case "==":
                    return c(left, st) == c(right, st);

                case "===":
                    return c(left, st) === c(right, st);

                case "!=":
                    return c(left, st) != c(right, st);

                case "!==":
                    return c(left, st) !== c(right, st);

                case "<=":
                    return c(left, st) <= c(right, st);

                case ">=":
                    return c(left, st) >= c(right, st);

                case "&":
                    return c(left, st) & c(right, st);

                case "|":
                    return c(left, st) | c(right, st);

                case "^":
                    return c(left, st) ^ c(right, st);
            }
        },

        LogicalExpression: function(node, st, c)
        {
            var left = node.left,
                right = node.right;

            switch (node.operator)
            {
                case "||":
                    return c(left, st) || c(right, st);

                case "&&":
                    return c(left, st) && c(right, st);
            }
        },

        Literal: function(node, st, c)
        {
            return node.value;
        },

        Identifier: function(node, st, c)
        {
            return isMacro(node.name) ? 1 : 0;
        },

        DefinedExpression: function(node, st, c) {
            return isMacro(node.name);
        }
    }, {});
};

    */
