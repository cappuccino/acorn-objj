"use strict";

const
    overrides = {

        objj_checkLVal(next, expr, isBinding, checkClashes)
        {
            switch (expr.type)
            {
                case "objj_Dereference":
                    // istanbul ignore next: unable to trigger this
                    if (isBinding)
                        this.raise(expr.start, "Binding dereference");
                    break;

                case "objj_Self":
                    break;

                default:
                    next.call(this, expr, isBinding, checkClashes);
            }
        },

        objj_toAssignable(next, node, isBinding)
        {
            if (node.type === "objj_Self")
                return node;

            return next.call(this, node, isBinding);
        }
    };

exports.init = function(parser)
{
    const pp = parser.constructor.prototype;

    if (pp.objj_checkLVal)
        return;

    for (const key of Object.keys(overrides))
        pp[key] = overrides[key];
};
