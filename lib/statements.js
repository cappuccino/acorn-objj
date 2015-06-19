"use strict";

var acorn = require("acorn");

require("./token-types");

var tt = acorn.tokTypes;

/*
    objj:

    local: boolean - Whether the import is local or system
    filename: Literal node - Path to the file to be imported
*/
acorn.Parser.prototype.objj_parseImportStatement = function()
{
    var node = this.startNode(),
        objj = {};

    this.next();
    node.objj = objj;

    if (this.type === tt.string)
        objj.local = true;
    else if (this.type === tt.objj_filename)
        objj.local = false;
    else
        this.unexpected();

    objj.filename = this.parseLiteral(this.input.slice(this.start + 1, this.end - 1));

    return this.finishNode(node, "objj_ImportStatement");
};

/*
    objj:

    id: Identifier node - Type name
*/
acorn.Parser.prototype.objj_parseTypeDeclaration = function(type)
{
    var node = this.startNode(),
        objj = {};

    this.next();
    node.objj = objj;
    objj.id = this.parseIdent(false);

    return this.finishNode(node, "objj_" + type + "Statement");
};

/*
    objj:

    name: Identifier node - Class name
    superclass: Identifier node - Superclass name
    category: Identifier node - Category name
    protocols: Array - Identifier nodes
    ivars: Array - ivar nodes
    body: Array - Statement nodes
*/
acorn.Parser.prototype.objj_parseClassDeclaration = function()
{
    if (this.objj_getState("@implementation") || this.objj_getState("@interface"))
        this.raise(this.start, "Expected @end before @implementation");

    // Let the parser know we are parsing an @implementation,
    // to prevent a nested @implementation/@interface.
    this.objj_setState("@implementation", true);

    var node = this.startNode(),
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
        this.objj_expect(tt.parenR, "Expected closing ')' after category name");
    }

    // Parse protocol list
    if (this.value === "<")
    {
        this.next();

        var protocols = [],
            first = true;

        objj.protocols = protocols;

        while (this.value !== ">")
        {
            if (!first)
                this.objj_expect(tt.comma, "Expected ',' between protocol names");
            else
                first = false;

            protocols.push(this.parseIdent(true));
        }

        this.next();
    }

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

        var statement = this.objj_parseClassBodyStatement();

        if (statement)
            objj.body.push(statement);
    }

    this.finishNode(node, "objj_ClassDeclaration");
    this.objj_setState("@implementation", false);

    return node;
};

/*
    objj:

    isOutlet: boolean - Whether the ivar is an IB outlet
    type: objj_ObjectiveJType node - The ivar's type
    id: Identifier node - The ivar's name
    accessors: Object - Keys are accessor attribute names, values are:
        property, getter, setter - Identifier node
        readwrite, readonly, copy - true
*/
acorn.Parser.prototype.objj_parseIvarDeclaration = function()
{
    var isOutlet;

    if (this.eat(tt._objj_outlet))
        isOutlet = true;

    var type = this.objj_parseObjectiveJType();

    if (this.strict && acorn.reservedWords.strictBind(type.name))
        this.raise(type.start, "Binding " + type.name + " in strict mode");

    var decl = this.startNode(),
        objj = {};

    decl.objj = objj;

    if (isOutlet)
        objj.isOutlet = isOutlet;

    objj.type = type;
    objj.id = this.parseIdent();

    if (this.strict && acorn.reservedWords.strictBind(objj.id.name))
        this.raise(objj.id.start, "Binding " + objj.id.name + " in strict mode");

    if (this.eat(tt._objj_accessors))
        this.objj_parseAccessors(objj);

    this.finishNode(decl, "objj_IvarDeclaration");
    this.semicolon();

    return decl;
};

acorn.Parser.prototype.objj_parseAccessors = function(objj)
{
    var accessors = {};

    objj.accessors = accessors;

    if (!this.eat(tt.parenL) || this.eat(tt.parenR))
        return;

    do
    {
        var attribute = this.parseIdent(true);

        switch (attribute.name)
        {
            case "property":
            case "getter":
                this.objj_expect(tt.eq, "Expected '=' after 'getter' accessor attribute");
                accessors[attribute.name] = this.parseIdent(true);
                break;

            case "setter":
                this.objj_expect(tt.eq, "Expected '=' after 'setter' accessor attribute");

                var setter = this.parseIdent(true);

                accessors[attribute.name] = setter;

                if (this.eat(tt.colon))
                    setter.end = this.start;

                setter.name += ":";
                break;

            case "readwrite":
            case "readonly":
            case "copy":
                accessors[attribute.name] = true;
                break;

            default:
                this.raise(attribute.start, "Unknown accessors attribute '" + attribute.name + "'");
        }
    }
    while (this.eat(tt.comma));

    this.objj_expect(tt.parenR, "Expected closing ')' after accessor attributes");
};

/*
    objj (for methods):

    methodType: string - "+" or "-"
    action: objj_ActionType node
    returnType: objj_ObjectiveJType node
    selectors: Array - Identifier nodes, one for each element in args
    args: Array - Objects with these keys/values:
        type: objj_ObjectiveJType node
        id: Identifier node
    hasOptionalArgs: boolean - true if signature ends with ", ..."
    body: BlockStatement node
*/
acorn.Parser.prototype.objj_parseClassBodyStatement = function()
{
    var statement = this.startNode();

    if (this.type === tt.plusMin)
    {
        var objj = {};

        statement.objj = objj;
        this.objj_parseMethodDeclaration(statement);
        this.eat(tt.semi);

        // Methods start a new Javascript scope as if we are
        // in a function, so tell the parser that is the case.
        var oldInFunc = this.inFunction,
            oldLabels = this.labels;

        this.inFunction = true;
        this.labels = [];

        objj.body = this.parseBlock(true);

        this.inFunction = oldInFunc;
        this.labels = oldLabels;

        return this.finishNode(statement, "objj_MethodDeclaration");
    }

    return this.parseStatement();
};

acorn.Parser.prototype.objj_parseMethodDeclaration = function(node)
{
    var objj = node.objj;

    objj.methodType = this.value;
    this.objj_expect(tt.plusMin, "Method declaration must start with '+' or '-'");

    // If we find a '(' we have a return type to parse
    if (this.eat(tt.parenL))
    {
        var typeNode = this.startNode();

        if (this.eat(tt._objj_action))
        {
            objj.action = this.finishNode(typeNode, "objj_ActionType");
            typeNode = this.startNode();
        }

        if (!this.eat(tt.parenR))
        {
            objj.returnType = this.objj_parseObjectiveJType(typeNode);
            this.objj_expect(tt.parenR, "Expected closing ')' after method return type");
        }
    }

    // Now we parse the selector
    var first = true,
        selectors = [],
        args = [];

    objj.selectors = selectors;
    objj.args = args;

    for (;;)
    {
        if (this.type !== tt.colon)
        {
            selectors.push(this.parseIdent(true));

            if (first && this.type !== tt.colon)
                break;
        }
        else
            selectors.push(null);

        this.objj_expect(tt.colon, "Expected ':' in selector");

        var argument = {};

        args.push(argument);

        if (this.eat(tt.parenL))
        {
            argument.type = this.objj_parseObjectiveJType();
            this.objj_expect(tt.parenR, "Expected closing ')' after method argument type");
        }

        argument.id = this.parseIdent(false);

        if (this.type === tt.braceL || this.type === tt.semi)
            break;

        if (this.eat(tt.comma))
        {
            this.objj_expect(tt.ellipsis, "Expected '...' after ',' in method declaration");
            objj.hasOptionalArgs = true;
            break;
        }

        first = false;
    }
};

acorn.Parser.prototype.objj_parseStatement = function(next, declaration, topLevel)
{
    switch (this.type)
    {
        case tt._objj_implementation:
            return this.objj_parseClassDeclaration();

        case tt._objj_import:
            return this.objj_parseImportStatement();

        default:
            return next.call(this, declaration, topLevel);
    }
};
