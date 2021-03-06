"use strict";

const
    acorn = require("acorn"),
    flags = require("./flags.js");

const tt = acorn.tokTypes; // jscs: ignore requireMultipleVarDecl

exports.init = function(parser)
{
    const pp = parser.constructor.prototype;

    if (pp.objj_parseImportStatement)
        return;

    for (const key of Object.keys(overrides))
        pp[key] = overrides[key];
};

const overrides = {

    /*
        objj:

        local: boolean - Whether the import is local or system
        filename: Literal node - Path to the file to be imported
    */
    objj_parseImportStatement()
    {
        let node = this.startNode(),
            objj = {};

        this.next();
        node.objj = objj;

        // Because we use a custom tokenizer for @import filenames,
        // it's guaranteed this.type will be tt.string or tt.filename.
        objj.local = this.type === tt.string;
        objj.filename = this.value;
        this.next();

        return this.finishNode(node, "objj_ImportStatement");
    },

    /*
        objj:

        ids: Array - Identifier nodes containing type name
    */
    objj_parseTypeDeclaration(type)
    {
        let node = this.startNode(),
            objj = { ids: [] };

        this.next();
        node.objj = objj;

        do
            objj.ids.push(this.parseIdent(false));
        while (this.eat(tt.comma));

        return this.finishNode(node, `objj_${type}Statement`);
    },

    /*
        objj:

        name: Identifier node - Class name
        superclass: Identifier node - Superclass name
        category: Identifier node - Category name
        protocols: Array - Identifier nodes
        ivars: Array - ivar nodes
        body: Array - Statement nodes
    */
    objj_parseClassDeclaration()
    {
        let node = this.startNode(),
            objj = {};

        node.objj = objj;
        this.next();

        // Parse the name
        objj.name = this.parseIdent(true);

        // Parse optional superclass or category
        if (this.eat(tt.colon))
            objj.superclass = this.parseIdent(true);
        else if (this.eat(tt.parenL))
        {
            objj.category = this.parseIdent(true);
            this.expect(tt.parenR, "after category name");
        }

        this.objj_parseProtocolList(objj);

        // Parse ivar declarations
        if (this.eat(tt.braceL))
        {
            objj.ivars = [];

            while (!this.eat(tt.braceR))
                objj.ivars.push(this.objj_parseIvarDeclaration());
        }

        // Parse class body statements
        objj.body = [];

        while (!this.eat(tt._objj_end))
        {
            if (this.type === tt.eof)
                this.raise(this.pos, "Expected @end after @implementation");

            objj.body.push(this.objj_parseClassBodyStatement());
        }

        this.finishNode(node, "objj_ClassDeclaration");

        return node;
    },

    /*
        objj:

        isOutlet: boolean - Whether the ivar is an IB outlet
        type: objj_ObjectiveJType node - The ivar's type
        id: Identifier node - The ivar's name
        accessors: Object - Keys are accessor attribute names, values are:
            property, getter, setter - Identifier node
            readwrite, readonly, copy - true
    */
    objj_parseIvarDeclaration()
    {
        let isOutlet;

        if (this.eat(tt._objj_outlet) || this.eat(tt._objj_IBOutlet))
            isOutlet = true;

        const type = this.objj_parseObjectiveJType();

        let decl = this.startNode(),
            objj = {};

        decl.objj = objj;
        objj.isOutlet = isOutlet;
        objj.type = type;
        objj.id = this.parseIdent();

        if (this.eat(tt._objj_accessors))
            this.objj_parseAccessors(objj);

        this.finishNode(decl, "objj_IvarDeclaration");
        this.objj_semicolon();

        return decl;
    },

    objj_parseAccessors(objj)
    {
        let accessors = {};

        objj.accessors = accessors;

        if (!this.eat(tt.parenL) || this.eat(tt.parenR))
            return;

        do
        {
            const attribute = this.parseIdent(true);

            switch (attribute.name)
            {
                case "property":
                case "getter":
                    this.expect(tt.eq, "after 'getter' accessor attribute");
                    accessors[attribute.name] = this.parseIdent(true);
                    break;

                case "setter":
                    {
                        this.expect(tt.eq, "after 'setter' accessor attribute");

                        const setter = this.parseIdent(true);

                        accessors[attribute.name] = setter;

                        if (this.eat(tt.colon))
                            setter.end = this.start;

                        setter.name += ":";
                        break;
                    }

                case "readwrite":
                case "readonly":
                case "copy":
                    accessors[attribute.name] = true;
                    break;

                default:
                    this.raise(attribute.start, `Unknown accessors attribute '${attribute.name}'`);
            }
        }
        while (this.eat(tt.comma));

        this.expect(tt.parenR, "after accessor attributes");
    },

    /*
        objj (for methods):

        methodType: string - "+" or "-"
        action: objj_ActionType node
        returnType: objj_ObjectiveJType node
        selectors: Array - Identifier nodes, one for each element in params
        params: Array - Objects with these keys/values:
            type: objj_ObjectiveJType node
            id: Identifier node
        acceptsVarArgs: boolean - true if signature ends with ", ..."
        body: BlockStatement node
    */
    objj_parseClassBodyStatement()
    {
        let statement = this.startNode(),
            node = null;

        switch (this.type)
        {
            case tt.plusMin:
                {
                    let objj = {};

                    statement.objj = objj;
                    this.objj_parseMethodDeclaration(statement);
                    this.eat(tt.semi);

                    // Methods start a new Javascript scope as if we are
                    // in a function, so tell the parser that is the case.
                    const
                        oldInFunc = this.inFunction,
                        oldLabels = this.labels;

                    this.inFunction = true;
                    this.labels = [];

                    objj.body = this.parseBlock(true);

                    this.inFunction = oldInFunc;
                    this.labels = oldLabels;

                    node = this.finishNode(statement, "objj_MethodDeclaration");
                    break;
                }

            // These statements are also valid within an @implementation
            case tt._function:
            case tt._var:
            case tt._const:
            case tt._objj_class:
            case tt._objj_global:
            case tt._objj_typedef:
                // Pass true to allow functions
                node = this.parseStatement(true);
                break;

            default:
                this.raise(this.start, "Unexpected statement within an @implementation");
        }

        return node;
    },

    /*
        objj (for methods):

        methodType: string - "+" or "-"
        action: objj_ActionType node
        returnType: objj_ObjectiveJType node
        selectors: Array - Identifier nodes, one for each element in params
        params: Array - Objects with these keys/values:
            type: objj_ObjectiveJType node
            id: Identifier node
        acceptsVarArgs: boolean - true if signature ends with ", ..."
        body: BlockStatement node
    */
    objj_parseMethodDeclaration(node)
    {
        let objj = node.objj;

        objj.methodType = this.value;
        this.expect(tt.plusMin, "!Method declaration must start with '+' or '-'");

        // If we find a '(' we have a return type to parse
        if (this.eat(tt.parenL))
        {
            const startLoc = this.startLoc;
            let typeNode = this.startNode();

            if (this.eat(tt._objj_action) || this.eat(tt._objj_IBAction))
            {
                objj.action = this.finishNode(typeNode, "objj_ActionType");
                typeNode = this.startNode();
            }

            if (!this.eat(tt.parenR))
            {
                objj.returnType = this.objj_parseObjectiveJType(false, typeNode, startLoc);
                this.expect(tt.parenR, "after method return type");
            }
        }

        // Now we parse the selector
        let first = true,
            selectors = [],
            params = [];

        objj.selectors = selectors;
        objj.params = params;

        while (true)
        {
            if (this.type !== tt.colon)
            {
                selectors.push(this.parseIdent(true));

                if (first && this.type !== tt.colon)
                    break;
            }
            else
                selectors.push(null);

            this.expect(tt.colon, "in selector");

            let argument = {};

            params.push(argument);

            if (this.eat(tt.parenL))
            {
                argument.type = this.objj_parseObjectiveJType(true);
                this.expect(tt.parenR, "after method argument type");
            }

            argument.id = this.parseIdent(false);

            if (this.type === tt.braceL || this.type === tt.semi)
                break;

            if (this.type === tt.comma)
            {
                // Before parsing the next token, make sure we allow an ellipses
                this.objj_setFlag(flags.kExpectEllipsis);
                this.next();
                this.objj_clearFlag(flags.kExpectEllipsis);
                this.expect(tt.ellipsis, "after ',' in method declaration");

                objj.acceptsVarArgs = true;
                break;
            }

            first = false;
        }
    },

    objj_parseProtocolList(objj)
    {
        if (this.value === "<")
        {
            this.next();

            let protocols = [],
                first = true;

            objj.protocols = protocols;

            while (this.value !== ">")
            {
                if (!first)
                    this.expect(tt.comma, "between protocol names");
                else
                    first = false;

                protocols.push(this.parseIdent(true));
            }

            this.next();
        }
    },

    /*
        objj

        name: identifier node
        protocols: Array - Identifier nodes
        optional: Array - Method declarations
        required: Array - Method declarations
    */
    objj_parseProtocolDeclaration()
    {
        let node = this.startNode(),
            objj = {};

        node.objj = objj;

        this.next();
        objj.name = this.parseIdent(true);
        this.objj_parseProtocolList(objj);

        while (!this.eat(tt._objj_end))
        {
            if (this.type === tt.eof)
                this.raise(this.pos, "Expected @end after @protocol");

            if (this.eat(tt._objj_required))
                continue;

            if (this.eat(tt._objj_optional))
            {
                while (!this.eat(tt._objj_required) && this.type !== tt._objj_end)
                    (objj.optional || (objj.optional = [])).push(this.objj_parseProtocolClassElement());
            }
            else
                (objj.required || (objj.required = [])).push(this.objj_parseProtocolClassElement());
        }

        return this.finishNode(node, "objj_ProtocolDeclaration");
    },

    objj_parseProtocolClassElement()
    {
        let node = this.startNode();

        node.objj = {};
        this.objj_parseMethodDeclaration(node);
        this.objj_semicolon();

        return this.finishNode(node, "objj_MethodDeclaration");
    },

    objj_parseStatement(next, declaration, topLevel)
    {
        // This is a special case when trying figure out if this is a subscript
        // to the former line or a new send message statement on this line...
        if (this.objj.messageSend)
        {
            let node = this.startNode(),
                messageNode = this.objj.messageSend;

            this.objj.messageSend = null;
            node.expression = this.objj_parseMessageSendExpression(messageNode, messageNode.objj.receiver);
            this.objj_semicolon();

            return this.finishNode(node, "ExpressionStatement");
        }

        switch (this.type)
        {
            case tt._objj_implementation:
                return this.objj_parseClassDeclaration(next);

            case tt._objj_import:
                return this.objj_parseImportStatement();

            case tt._objj_protocol:
                return this.objj_parseProtocolDeclaration();

            case tt._objj_class:
                return this.objj_parseTypeDeclaration("Class");

            case tt._objj_global:
                return this.objj_parseTypeDeclaration("Global");

            case tt._objj_typedef:
                return this.objj_parseTypeDeclaration("TypeDef");

            default:
                return next.call(this, declaration, topLevel);
        }
    }
};
