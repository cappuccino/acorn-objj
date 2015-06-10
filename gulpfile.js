"use strict";

var del = require("del"),
    fs = require("fs"),
    gulp = require("gulp"),
    loadPlugins = require("gulp-load-plugins"),
    path = require("path"),
    run = require("./test/lib/test-utils").run,
    runSequence = require("run-sequence"),
    stylish = require("gulp-jscs-stylish");

// jscs: disable requireMultipleVarDecl

var $ = loadPlugins();

// Cleaning

gulp.task("clean", function(done)
{
    del("test/fixtures/**/*.json", done);
});

// Linting

var sourceFiles = [
        "gulpfile.js",
        "lib/*.js",
        "test/*.js",
        "test/lib/*.js"
    ];

gulp.task("lint:eslint", function()
{
    return gulp.src(sourceFiles)
        .pipe($.eslint())
        .pipe($.eslint.format("stylish"));
});

gulp.task("lint:jscs", function()
{
    return gulp.src(sourceFiles)
        .pipe($.jscs())
        .on("error", function() {})
        .pipe(stylish());
});

gulp.task("lint", function(cb)
{
    runSequence("lint:eslint", "lint:jscs", cb);
});

// Fixtures

var fixturesPath;

gulp.task("generate-fixtures", function(done)
{
    fixturesPath = path.resolve("test/fixtures/cli");

    var cliFixtures = [
            [["--allow-hash-bang"], "hash-bang.js"],
            [[], "compact.js", "pretty.json"],
            [["--compact"], "compact.js"],
            [["--ecma", "6"], "ecma.js"],
            [["--locations"], "compact.js", "locations.json"],
            [["--macro", "FOO"], "macro1.js"],
            [["--macro", "[FOO, BAR=7]"], "macro2.js"]
        ];

    cliFixtures.forEach(function(fixture)
    {
        var args = fixture[0].slice(0),
            source = fixture[1],
            dest = fixture[2];

        if (!dest)
            dest = path.basename(source, path.extname(source)) + ".json";

        args.push(path.join(fixturesPath, source));

        var output = run(args, { parseOptions: { slice: 0 }}).output;

        fs.writeFileSync(path.join(fixturesPath, dest), output);
        console.log("cli/" + dest);
    });

    done();
});

gulp.task("regenerate-fixtures", function(cb)
{
    runSequence("clean", "generate-fixtures", cb);
});

// Tests

gulp.task("istanbul", function(cb)
{
    return gulp.src("lib/*.js")
        .pipe($.istanbul())
        .pipe($.istanbul.hookRequire());
});

gulp.task("mocha", function()
{
    return gulp.src("test/*.js")
        .pipe($.mocha({ reporter: "dot" }));
});

gulp.task("cover", ["istanbul"], function()
{
    //runSequence("istanbul");

    return gulp.src("test/*.js")
        .pipe($.mocha({ reporter: "dot" }))
        .pipe($.istanbul.writeReports({
            dir: "test/coverage",
            reporters: ["lcov", "html", "text"]
        }));
});

gulp.task("test", function(cb)
{
    runSequence("lint", "regenerate-fixtures", "mocha", cb);
});
