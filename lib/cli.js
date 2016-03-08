"use strict";

const
    acorn = require("acorn"),
    chalk = require("chalk"),
    fs = require("fs"),
    issueHandler = require("acorn-issue-handler"),
    parse = require("./parse.js").parse,
    utils = require("./utils.js");

exports.getEnvironment = function()
{
    const pkg = require("../package.json");

    return {
        executable: Object.keys(pkg.bin)[0],
        version: pkg.version,
        acornVersion: acorn.version
    };
};

exports.getVersionString = function()
{
    const env = exports.getEnvironment();

    return `${env.executable} v${env.version} (acorn v${env.acornVersion})`;
};

const
    optionDefinitions = [

        { heading: chalk.cyan("acorn options") },

        {
            option: "allow-hash-bang",
            type: "Boolean",
            "default:": false,
            description: "If the first line of the code starts with " +
                chalk.grey("#!") + ", it is considered a comment."
        },
        {
            option: "compact",
            type: "Boolean",
            "default:": false,
            description: "No whitespace will be used in the AST output."
        },
        {
            option: "ecma",
            alias: "e",
            type: "Number",
            default: "5",
            description: "Indicates the ECMAScript version to parse. Must be either 3, 5, or 6. " +
                "This influences support for strict mode, the set of reserved words," +
                " and support for new syntax features."
        },
        {
            option: "help",
            alias: "h",
            type: "Boolean",
            description: "Shows this help."
        },
        {
            option: "locations",
            alias: "l",
            type: "Boolean",
            default: "false",
            description: "Attaches a \"loc\" object to each node with \"start\" and \"end\" subobjects," +
                " each of which contains the one-based line and zero-based column numbers in {line, column} form."
        },
        {
            option: "module",
            type: "Boolean",
            default: "false",
            description: "Sets the parsing mode to \"module\". The parsing mode is \"script\" by default."
        },
        {
            option: "silent",
            alias: "s",
            type: "Boolean",
            default: "false",
            description: "All output is suppressed, including errors. Only the exit status is returned."
        },
        {
            option: "strict-semicolons",
            type: "Boolean",
            default: "false",
            description: "Statements that do not end in semicolons will generate an error."
        },
        {
            option: "version",
            alias: "v",
            type: "Boolean",
            description: "Shows the current version and exit."
        },

        { heading: chalk.cyan("acorn-objj extensions") },

        {
            option: "color",
            type: "Boolean",
            default: "true",
            description: "Turns off colored output."
        },
        {
            option: "objj",
            type: "Boolean",
            default: "true",
            description: "Turns off Objective-J parsing."
        },
        {
            option: "stack-trace",
            type: "Boolean",
            default: "false",
            description: "Displays a stack trace on errors."
        }
    ],
    optionatorConfig = {
        prepend: chalk.cyan(exports.getVersionString() + " \nUsage") +
        ": {{executable}} [options] file\n\nParses a file and outputs an AST. " +
        "If " + chalk.yellow("file") + " is '-', reads from stdin.",

        append: chalk.cyan("Exit status") + ":\n" + chalk.yellow("acorn_objj") +
        " exits with one of the following values:\n\n" +
        "   0  Parse completed with no errors\n" +
        "   1  Parse encountered an error",

        helpStyle: {
            maxPadFactor: 2 // Give a little more padding to the name column
        },

        options: optionDefinitions,

        mutuallyExclusive: [
            ["silent", "stack-trace"]
        ]
    };

let optionator,
    useStdin = false;

function generateHelp()
{
    return utils.colorizeOptions(optionator.generateHelp({ interpolate: exports.getEnvironment() }));
}

function parseOptions(args, parseOpts)
{
    optionator = require("optionator")(optionatorConfig);

    const options = optionator.parse(args, parseOpts);

    if (options.version || options.help)
        return options;

    const files = options._;

    if (files.length > 1)
        utils.failWithMessage("Only one file may be parsed at a time");

    if (files[0] === "-")
    {
        useStdin = true;
        options.file = "<stdin>";
    }
    else
    {
        useStdin = false;
        options.file = files[0];
    }

    if (files.length === 0 && !useStdin)
        utils.failWithMessage("No input file");

    chalk.enabled = options.color;
    options.ecmaVersion = options.ecma;
    delete options.ecma;

    if (options.module)
        options.sourceType = "module";

    delete options.module;

    // Copy objj options to a subobject so they can easily be passed
    // with the objj plugin.
    options.objjOptions = {};

    const objjOptions = [
            "color",
            "objj",
            "betterErrors"
        ];

    for (let key of objjOptions)
        options.objjOptions[key] = options[key];

    return options;
}

exports.run = function(args, runOptions)
{
    runOptions = runOptions || /* istanbul ignore next */ {};

    let options = {},
        ast = null,
        exitCode = 0,
        issues = new issueHandler.IssueList(),
        source = "",
        error,
        stackTrace;

    try
    {
        options = parseOptions(args, runOptions.parseOptions);

        if (options.version)
            console.log(exports.getVersionString());
        else if (options.help)
            console.log(generateHelp());
        else
        {
            if (useStdin)
            {
                source = utils.readStreamSync(
                    runOptions.stdin || /* istanbul ignore next */ process.stdin
                );
            }
            else
                source = fs.readFileSync(options.file, { encoding: "utf8" });

            ast = parse(source, options, issues);

            if (!options.silent)
                console.log(JSON.stringify(ast, null, options.compact ? 0 : 2));
        }
    }
    catch (ex)
    {
        if (!options.silent)
        {
            error = ex;

            if (!issueHandler.isIssue(ex))
            {
                if (options.stackTrace)
                    stackTrace = ex.stack;

                console.log(`${exports.getEnvironment().executable}: ${chalk.red("error:")} ${ex.message}`);
            }
        }

        exitCode = 1;
    }

    if (!options.silent)
    {
        if (issues.length > 0)
        {
            // istanbul ignore next
            // Add a blank line between the AST and issues
            if (ast)
                console.log();

            issues.log(options.color);
        }

        if (error && options.stackTrace)
        {
            const filter = [String.raw`Parser\.objj_raise`];

            console.log("\n" + (stackTrace || error.getStackTrace(filter)));
        }
    }

    return exitCode;
};
