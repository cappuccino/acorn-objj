"use strict";

const
    del = require("del"),
    exec = require("child_process").exec,
    fs = require("fs"),
    gulp = require("gulp"),
    loadPlugins = require("gulp-load-plugins"),
    parse = require("./lib/parse.js").parseFileToString,
    path = require("path"),
    PluginError = require("gulp-util").PluginError,
    run = require("./test/lib/test-utils.js").run,
    runSequence = require("run-sequence"),
    through = require("through2").obj;

const // jscs: ignore requireMultipleVarDecl
    $ = loadPlugins(),
    basePaths = [
        "gulpfile.js",
        "lib/*.js",
        "test/**/*.js",
        "!test/coverage/**/*.js",
        "!test/fixtures/**/*.js"
    ],
    paths = {
        lint: [...basePaths, "!test/acorn/*"],
        fixtures: ["test/fixtures/**/*.j"],
        test: ["test/*.js"],
        coverage: ["lib/**/*.js"]
    };

// Cleaning

gulp.task("clean", () => del("test/fixtures/**/*.{json,txt}"));

// Linting

gulp.task("lint:eslint", () =>
    gulp.src(paths.lint)
        .pipe($.eslint())
        .pipe($.eslint.format("node_modules/eslint-clang-formatter"))
        .pipe($.eslint.failAfterError())
);

gulp.task("lint:jscs", () =>
    gulp.src(paths.lint)
        .pipe($.jscs())
        .pipe($.jscs.reporter("jscs-clang-reporter"))
        .pipe($.jscs.reporter("fail"))
);

gulp.task("lint", cb => runSequence("lint:eslint", "lint:jscs", cb));

// Fixtures

gulp.task("generate-fixtures", () =>
{
    const fixturesPath = "test/fixtures";

    function parseFixture(file, encoding, cb)
    {
        let options = {};

        if (path.basename(file.path) === "multiple-lines.j")
            options.locations = true;

        console.log(file.relative);
        file.contents = new Buffer(parse(file.path, options));
        cb(null, file);
    }

    const cliFixtures = [
        [["--no-color"], "hash-bang.js", "hash-bang.txt"],
        [["--allow-hash-bang"], "hash-bang.js"],
        [[], "compact.js", "pretty.json"],
        [["--compact"], "compact.js"],
        [[], "ecma.js", "ecma.txt"],
        [["--ecma", "6"], "ecma.js"],
        [["--locations"], "compact.js", "locations.json"],
        [["--no-objj"], "objj.j", "objj.txt"],
        [["--no-objj"], "no-objj.js"],
        [["--strict-semicolons"], "strict-semicolons.js", "strict-semicolons.txt"],
        [["--module", "--ecma", "5"], "module.js", "module.txt"]
    ];

    for (let fixture of cliFixtures)
    {
        let args = fixture[0].slice(),
            source = fixture[1],
            dest = fixture[2],
            baseDir = fixture[3] || "cli";

        if (!dest)
            dest = path.basename(source, path.extname(source)) + ".json";

        let basePath = path.join(fixturesPath, baseDir),
            sourcePath = path.join(basePath, source),
            destPath = path.join(basePath, dest),
            sourceStat,
            destStat;

        try
        {
            sourceStat = fs.statSync(sourcePath);
            destStat = fs.statSync(destPath);

            // Don't bother if the source file has not changed since
            // the last write of the dest file.
            if (sourceStat.mtime <= destStat.mtime)
                break;
        }
        catch (ex)
        {
            // Don't do anything
        }

        args.push(sourcePath);

        const output = run(args, { parseOptions: { slice: 0 }}).output;

        fs.writeFileSync(destPath, output);
        console.log(`${baseDir}/${dest}`);
    }

    return gulp.src(paths.fixtures)
        .pipe($.changed("test/fixtures", { extension: ".json" }))
        .pipe(through(parseFixture))
        .pipe($.rename({ extname: ".json" }))
        .pipe(gulp.dest("test/fixtures"));
});

gulp.task("regenerate-fixtures", cb => runSequence("clean", "generate-fixtures", cb));

// Tests

function mochaTask(reporter)
{
    return function()
    {
        return gulp.src(paths.test)
            .pipe($.mocha({ reporter: reporter || "spec" }));
    };
}

gulp.task("mocha", mochaTask("spec"));
gulp.task("mocha-dot", mochaTask("dot"));

let coverResults = "";

gulp.task("cover", cb =>
{
    // Add --colors to force colorizing, normally chalk won't because
    // it doesn't think it is writing to a terminal.

    exec("istanbul cover --colors node_modules/.bin/_mocha -- --reporter dot --colors", (error, stdout) =>
    {
        if (error)
        {
            error = new PluginError(
                "istanbul cover",
                {
                    message: error.message,
                    showStack: false
                }
            );

            return cb(error);
        }

        coverResults = stdout;

        return cb();
    });
});

gulp.task("show-cover", ["cover"], cb =>
{
    console.log(coverResults);
    cb();
});

gulp.task("check-cover", ["cover"], cb =>
{
    exec("istanbul check-cover", error =>
    {
        if (error)
        {
            error = new PluginError(
                "istanbul check-cover",
                {
                    message: "Coverage did not meet the thresholds",
                    showStack: false
                }
            );

            return cb(error);
        }

        return cb();
    });
});

// istanbul is broken on Windows
const tester = process.platform === "win32" ? "mocha-dot" : "check-cover";

gulp.task("test", cb => runSequence("lint", tester, cb));
gulp.task("default", ["test"]);
