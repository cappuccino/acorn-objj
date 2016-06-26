"use strict";

const
    acorn = require("acorn"),
    flags = require("./flags.js");

const  // jscs: ignore requireMultipleVarDecl
    tt = acorn.tokTypes,
    overrides = {

        /*
            objj:

            selector: string
        */
        objj_parseSelector(node, close)
        {
            let selectors = [];

            while (this.type !== close)
            {
                if (this.type === tt.colon)
                    this.raise(this.start, "Missing selector component");

                selectors.push(this.parseIdent(true).name);

                if (this.type !== close)
                {
                    this.expect(tt.colon, "in selector");
                    selectors.push(":");
                }
            }

            if (selectors.length === 0)
                this.raise(this.start, "Empty selector");

            node.objj.selector = selectors.join("");
        },

        /*
            objj:

            selectors: Array - Identifier nodes
            args: Array - Expression nodes
            varArgs: Array - Expression nodes following a comma
        */
        objj_parseSelectorWithArguments(node)
        {
            let first = true;

            node.objj.selectors = [];
            node.objj.args = [];

            while (true)
            {
                if (this.type === tt.colon)
                    node.objj.selectors.push(null);
                else
                {
                    node.objj.selectors.push(this.parseIdent(true));

                    if (first && this.eat(tt.bracketR))
                        break;
                }

                this.expect(tt.colon, "in selector");
                node.objj.args.push(this.parseMaybeAssign(true));

                if (this.eat(tt.bracketR))
                    break;

                if (this.type === tt.comma)
                {
                    node.objj.varArgs = [];

                    while (this.eat(tt.comma))
                        node.objj.varArgs.push(this.parseMaybeAssign(true));

                    this.eat(tt.bracketR);
                    break;
                }

                first = false;
            }
        },

        /*
            Parse a comma-separated list of <key>:<value> pairs and return them as
            [arrayOfKeyExpressions, arrayOfValueExpressions].
        */
        objj_parseDictionary()
        {
            this.eat(tt.braceL);

            let keys = [],
                values = [],
                first = true;

            while (!this.eat(tt.braceR))
            {
                if (!first)
                {
                    this.expect(tt.comma, "between expressions");

                    if (this.eat(tt.braceR))
                        break;
                }

                keys.push(this.parseMaybeAssign(true));
                this.expect(tt.colon, "between dictionary key and value");
                values.push(this.parseMaybeAssign(true));
                first = false;
            }

            return [keys, values];
        },

        /*
            objj:

            keys: Array - Expression nodes
            values: Array - Expression nodes
        */
        objj_parseDictionaryLiteral()
        {
            let node = this.startNode(),
                objj = {};

            node.objj = objj;
            this.next();

            const dict = this.objj_parseDictionary();

            objj.keys = dict[0];
            objj.values = dict[1];

            return this.finishNode(node, "objj_DictionaryLiteral");
        },

        /*
            objj:

            selector: string
        */
        objj_parseSelectorLiteral()
        {
            let node = this.startNode();

            node.objj = {};
            this.next();
            this.expect(tt.parenL, "after @selector");
            this.objj_parseSelector(node, tt.parenR);
            this.expect(tt.parenR, "after selector");

            return this.finishNode(node, "objj_SelectorLiteralExpression");
        },

        /*
            objj:

            protocol: id
        */
        objj_parseProtocolLiteral()
        {
            let node = this.startNode();

            node.objj = {};
            this.next();
            this.expect(tt.parenL, "after @protocol");
            node.objj.protocol = this.parseIdent();
            this.expect(tt.parenR, "after protocol name");

            return this.finishNode(node, "objj_ProtocolLiteralExpression");
        },

        /*
            objj:

            elements: Array - Expression nodes
        */
        objj_parseArrayLiteral(refDestructuringErrors)
        {
            let node = this.startNode();

            this.next();
            this.eat(tt.bracketL);
            node.objj = {
                elements: this.parseExprList(tt.bracketR, true, true, refDestructuringErrors)
            };

            return this.finishNode(node, "objj_ArrayLiteral");
        },

        /*
            objj:

            ref: Identifier node - The referenced identifier
        */
        objj_parseRef()
        {
            let node = this.startNode();

            this.next();
            this.expect(tt.parenL, "after '@ref'");

            if (this.type === tt.parenR)
                this.raise(this.start, "Empty reference");

            node.objj = {
                ref: this.parseIdent(node, tt.parenR)
            };

            this.expect(tt.parenR, "after ref");

            return this.finishNode(node, "objj_Reference");
        },

        /*
            objj:

            ref: Identifier node - The reference to deref
        */
        objj_parseDeref()
        {
            let node = this.startNode();

            this.next();
            this.expect(tt.parenL, "after '@deref'");

            if (this.type === tt.parenR)
                this.raise(this.start, "Empty dereference");

            node.objj = {
                ref: this.parseIdent(node, tt.parenR)
            };

            this.expect(tt.parenR, "after ref");

            return this.finishNode(node, "objj_Dereference");
        },

        /*
            Parse the next token as an Objective-J type. It can be:

            - 'id' followed by a optional protocol list '<CPKeyValueBinding, ...>'
            - 'void', 'id', 'SEL' or 'JSObject'
            - 'char', 'byte', 'short', 'int' or 'long', optionally preceded by 'signed' or 'unsigned'
            - 'float' or 'double'
            - '@ref' optionally followed by '<type>', where 'type' is an Objective-J type.
            - Any other non-keyword or non-reserved word.

            'int' and 'long' may be preceded by 'long'.

            objj:

            name: string - The type's name
            isClass: boolean - Whether the type is a class or a POD
            protocols: Array - Array of Identifier nodes
            refType: Objective-J type node - The type of a ref's target (if specified)
        */
        objj_parseObjectiveJType(canBeRef, startNode, startLoc)
        {
            if (this.type.keyword)
            {
                if (!this.type.objj_isType)
                    this.unexpected();
            }
            else if (this.strict && this.reservedWords.test(this.value))
                this.raise(this.start, `The keyword '${this.value}' is reserved`);

            let node = startNode ? this.startNodeAt(startNode.start, startLoc) : this.startNode(),
                objj = {};

            node.objj = objj;

            if (this.type === tt.name)
            {
                // It should be a class name
                objj.name = this.value;
                objj.isClass = true;
                this.next();
            }
            else
            {
                objj.isClass = false;
                objj.name = this.type.keyword;

                // Do nothing more if it is 'void'
                if (!this.eat(tt._void))
                {
                    if (this.eat(tt._objj_id))
                    {
                        // If it is 'id' followed by '<', parse protocols. Do nothing more if it is only 'id'.
                        if (this.value === "<")
                            this.objj_parseIdProtocolList(objj);
                    }
                    else if (this.eat(tt._objj_ref))
                    {
                        if (canBeRef)
                        {
                            if (this.value === "<")
                            {
                                this.next();
                                objj.refType = this.objj_parseObjectiveJType(true);

                                /* eslint-disable max-depth */
                                if (this.value === ">")
                                    this.next();
                                else
                                    this.unexpected();

                                /* eslint-enable max-depth */
                            }
                        }
                        else
                            this.raise(node.start, "@ref cannot be used as a type here");
                    }
                    else
                        this.objj_parsePODType(objj);
                }
            }

            return this.finishNode(node, "objj_ObjectiveJType");
        },

        objj_parseIdProtocolList(objj)
        {
            let first = true,
                protocols = [];

            objj.protocols = protocols;

            do
            {
                if (first)
                {
                    this.next();

                    if (this.value === ">")
                        this.raise(this.start, "Empty protocol list");

                    first = false;
                }
                else
                {
                    if (this.type !== tt.comma)
                        this.raise(this.start, "Expected a comma between protocols");

                    this.next();
                }

                protocols.push(this.parseIdent(true));
            }
            while (this.value !== ">");

            this.next();
        },

        objj_parsePODType(objj)
        {
            // Now check if it is some basic type or a valid combination of basic types
            let type = this.type;

            // eslint-disable-next-line curly
            if (type === tt._objj_float ||
                type === tt._objj_double ||
                type === tt._objj_BOOL ||
                type === tt._objj_SEL ||
                type === tt._objj_JSObject ||
                type === tt._objj_instancetype ||
                type === tt._objj_CPInteger ||
                type === tt._objj_CPUInteger ||
                type === tt._objj_CPTimeInterval)
            {
                this.next();
            }
            else
            {
                /*
                    We have a bunch of possibilities here:

                    (signed|unsigned)? (char|byte|short|int|long|long int|long long)?
                 */
                let haveSign = false;

                if (type === tt._objj_signed || type === tt._objj_unsigned)
                {
                    haveSign = true;
                    this.next();
                    type = this.type;
                }

                if (type === tt._objj_char ||
                    type === tt._objj_byte ||
                    type === tt._objj_short ||
                    type === tt._objj_int ||
                    type === tt._objj_long)
                {
                    if (haveSign)
                        objj.name += " " + this.type.keyword;

                    this.next();

                    if (type === tt._objj_long &&
                        (this.type === tt._objj_int || this.type === tt._objj_long))
                    {
                        objj.name += " " + this.type.keyword;
                        this.next();
                    }
                }
            }
        },

        objj_parseMaybeMessageSend(refDestructuringErrors)
        {
            /*
                Note we had to modify the original code in the parseExprAtom case
                for tt.bracketL, adding code before or after was not sufficient.
            */
            let node = this.startNode(),
                expr = null;

            // Set a flag that let's us know that "super" is the objj keyword
            this.objj_setFlag(flags.kMaybeMessageSend);

            this.next();

            this.objj_clearFlag(flags.kMaybeMessageSend);

            // istanbul ignore next
            // check whether this is array comprehension or regular array
            if (this.options.ecmaVersion >= 7 && this.type === tt._for)
                return this.parseComprehension(node, false);

            if (this.type !== tt.comma && this.type !== tt.bracketR)
            {
                expr = this.parseMaybeAssign(true, refDestructuringErrors);

                if (this.type !== tt.comma && this.type !== tt.bracketR)
                    return this.objj_parseMessageSendExpression(node, expr);
            }

            if (expr !== null || this.type !== tt.bracketR)
            {
                node.elements = [expr];

                if (this.eat(tt.comma))
                {
                    expr = this.parseExprList(tt.bracketR, true, true, refDestructuringErrors);
                    node.elements = node.elements.concat(expr);
                }
                else
                    this.eat(tt.bracketR);
            }
            else
            {
                node.elements = [];
                this.eat(tt.bracketR);
            }

            return this.finishNode(node, "ArrayExpression");
        },

        /*
            objj:

            selectors: Array - Identifier nodes
            args: Array - ExpressionStatement nodes
            varArgs: Array - ExpressionStatement nodes following a comma
            receiver: ExpressionStatement | objj_Super
        */
        objj_parseMessageSendExpression(node, receiver)
        {
            node.objj = { receiver };
            this.objj_parseSelectorWithArguments(node);

            return this.finishNode(node, "objj_MessageSendExpression");
        },

        objj_parseSubscripts(base, startPos, startLoc, noCalls)
        {
            // No way to monkey-patch this method, we had to copy/paste
            // the whole method and modify the tt.bracketL case.

            let node;

            while (true)
            {
                if (this.eat(tt.dot))
                {
                    node = this.startNodeAt(startPos, startLoc);
                    node.object = base;
                    node.property = this.parseIdent(true);
                    node.computed = false;
                    base = this.finishNode(node, "MemberExpression");
                }
                else if (this.type === tt.bracketL)
                {
                    let messageSendNode = this.startNode(),
                        lastTokEnd = this.lastTokEnd,
                        lastTokEndLoc = this.lastTokEndLoc;

                    this.next();

                    const expr = this.parseExpression();

                    if (this.type !== tt.bracketR)
                    {
                        messageSendNode.objj = {
                            receiver: expr,
                            lastTokEnd,
                            lastTokEndLoc
                        };

                        this.objj.messageSend = messageSendNode;

                        return base;
                    }

                    node = this.startNodeAt(startPos, startLoc);
                    node.object = base;
                    node.property = expr;
                    node.computed = true;
                    this.expect(tt.bracketR);
                    base = this.finishNode(node, "MemberExpression");
                }
                else if (!noCalls && this.eat(tt.parenL))
                {
                    node = this.startNodeAt(startPos, startLoc);
                    node.callee = base;
                    node.arguments = this.parseExprList(tt.parenR, false);
                    base = this.finishNode(node, "CallExpression");
                }

                // istanbul ignore next: don't care about testing this
                else if (this.ecmaVersion >= 6 && this.type === tt.backQuote)
                {
                    node = this.startNodeAt(startPos, startLoc);
                    node.tag = base;
                    node.quasi = this.parseTemplate();
                    base = this.finishNode(node, "TaggedTemplateExpression");
                }
                else
                    return base;
            }
        },

        objj_parseExprAtom(next, refDestructuringErrors)
        {
            switch (this.type)
            {
                case tt.bracketL:
                    return this.objj_parseMaybeMessageSend(refDestructuringErrors);

                case tt._objj_deref:
                    return this.objj_parseDeref();

                case tt._objj_ref:
                    return this.objj_parseRef();

                case tt._objj_selector:
                    return this.objj_parseSelectorLiteral();

                case tt.objj_arrayLiteral:
                    return this.objj_parseArrayLiteral(refDestructuringErrors);

                case tt.objj_dictionaryLiteral:
                    return this.objj_parseDictionaryLiteral();

                case tt._objj_protocol:
                    return this.objj_parseProtocolLiteral();

                default:
                    return next.call(this, refDestructuringErrors);
            }
        }
    };

exports.init = function(parser)
{
    const pp = parser.constructor.prototype;

    // If this function has already run, bail
    if (pp.objj_parseSelector)
        return;

    for (const key of Object.keys(overrides))
        pp[key] = overrides[key];
};
