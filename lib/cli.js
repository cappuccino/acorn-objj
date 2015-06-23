"use strict";

var acorn = require("acorn"),
    chalk = require("chalk"),
    format = require("util").format,
    fs = require("fs"),
    parse = require("./parse").parse,
    utils = require("./utils");

exports.getEnvironment = function()
{
    var pkg = require("../package.json");

    return {
        executable: Object.keys(pkg.bin)[0],
        version: pkg.version,
        acornVersion: acorn.version
    };
};

exports.getVersionString = function()
{
    var env = exports.getEnvironment();

    return format("%s v%s (acorn v%s)", env.executable, env.version, env.acornVersion);
};

var optionator,
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
            "default": "5",
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
            "default": "false",
            description: "Attaches a \"loc\" object to each node with \"start\" and \"end\" subobjects," +
                " each of which contains the one-based line and zero-based column numbers in {line, column} form."
        },
        {
            option: "silent",
            alias: "s",
            type: "Boolean",
            "default": "false",
            description: "All output is suppressed, including errors. Only the exit status is returned."
        },
        {
            option: "strict-semicolons",
            type: "Boolean",
            "default": "false",
            description: "Statements that do not end in semicolons will generate an error."
        },
        {
            option: "version",
            alias: "v",
            type: "Boolean",
            description: "Shows the current version and exit."
        },

        { heading: chalk.cyan("acorn_objj extensions") },

        {
            option: "macro",
            alias: "m",
            type: "String | [String]",
            description: "Defines a macro. The argument should be in the form <name>[(arg[, argN])]=<definition>. " +
                "A name with no args and no definition will be defined with the value 1. " +
                "To be safe from shell expansion, the argument should be enclosed in single quotes. " +
                "To define multiple macros, enclose multiple comma-delimited, single-quoted strings" +
                " in square brackets, all enclosed by double-quotes. \n\n" +
                chalk.cyan("Examples") + ":\n" +
                "--macro 'PLUS_ONE(arg)=arg + 1'\n" +
                "--macro \"['FOO(arg)=arg + 1', 'BAR(s)=\"\\\"foo\\\"\" + s', 'DEBUG']\""
        },
        {
            option: "macro-prefix",
            alias: "p",
            type: "String",
            description: "Macro definitions are read from the file at this path and applied to all compiled files."
        },
        {
            option: "color",
            type: "Boolean",
            "default": "true",
            description: "Turns off colored output."
        },
        {
            option: "objj",
            type: "Boolean",
            "default": "true",
            description: "Turns off Objective-J parsing."
        },
        {
            option: "preprocessor",
            type: "Boolean",
            "default": "true",
            description: "Turns off the preprocessor."
        },
        {
            option: "stack-trace",
            type: "Boolean",
            "default": "false",
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
    },
    useStdin = false;

// jscs: enable

function generateHelp()
{
    return utils.colorizeOptions(optionator.generateHelp({ interpolate: exports.getEnvironment() }));
}

function parseOptions(args, parseOpts)
{
    optionator = require("optionator")(optionatorConfig);

    var options = optionator.parse(args, parseOpts);

    if (options.version || options.help)
        return options;

    var files = options._;

    if (files.length > 1)
        utils.failWithMessage("Only one file may be parsed at a time");

    if (files[0] === "-")
    {
        useStdin = true;
        options.file = null;
    }
    else
    {
        useStdin = false;
        options.file = files[0];
    }

    if (files.length === 0 && !useStdin)
        utils.failWithMessage("No input file");

    options.ecmaVersion = options.ecma;
    delete options.ecma;

    // Copy objj options to a subobject so they can easily be passed
    // with the objj plugin.
    options.objjOptions = {};

    if (options.macro)
    {
        if (Array.isArray(options.macro))
            options.objjOptions.macros = options.macro;
        else
            options.objjOptions.macros = [options.macro];
    }
    else
        options.objjOptions.macros = [];

    var objjOptions = [
            "macroPrefix",
            "color",
            "objj",
            "preprocessor"
        ];

    for (var i = 0; i < objjOptions.length; ++i)
    {
        var key = objjOptions[i];

        options.objjOptions[key] = options[key];
    }

    return options;
}

function formatErrorMessage(message)
{
    return format(
        "%s: " + chalk.red("error: ") + "%s",
        exports.getEnvironment().executable,
        chalk.grey(message)
    );
}

exports.run = function(args, runOptions)
{
    runOptions = runOptions || /* istanbul ignore next */ {};

    var options = {},
        exitCode = 0;

    try
    {
        var source;

        options = parseOptions(args, runOptions.parseOptions);

        if (options.version)
        {
            console.log(exports.getVersionString());
        }
        else if (options.help)
        {
            console.log(generateHelp());
        }
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

            var ast = parse(source, options);

            if (!options.silent)
                console.log(JSON.stringify(ast, null, options.compact ? 0 : 2));
        }
    }
    catch (ex)
    {
        if (!options.silent)
        {
            // istanbul ignore next: a pain to test
            if (options.stackTrace)
                throw ex;

            console.log(formatErrorMessage(ex.message));
        }

        exitCode = 1;
    }

    return exitCode;
};
