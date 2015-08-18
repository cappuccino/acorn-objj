"use strict";

var del = require("del"),
    fs = require("fs"),
    gulp = require("gulp"),
    loadPlugins = require("gulp-load-plugins"),
    parse = require("./lib/parse.js").parseFileToString,
    path = require("path"),
    run = require("./test/lib/test-utils.js").run,
    runSequence = require("run-sequence");

// jscs: disable requireMultipleVarDecl

var $ = loadPlugins();

// Cleaning

gulp.task("clean", function(done)
{
    del("test/fixtures/**/*.{json,txt}", done);
});

// Linting

var sourceFiles = [
        "gulpfile.js",
        "lib/*.js",
        "test/**/*.js",
        "!test/coverage/**/*.js",
        "!test/fixtures/**/*.js"
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
        .pipe($.jscsStylish());
});

gulp.task("lint", function(cb)
{
    runSequence("lint:eslint", "lint:jscs", cb);
});

// Fixtures

var fixturesPath;

function parseFixture(file, encoding, cb)
{
    console.log(path.relative(fixturesPath, file.path));
    file.contents = new Buffer(parse(file.path));
    cb(null, file);
}

gulp.task("generate-fixtures", function()
{
    fixturesPath = "test/fixtures";

    var cliFixtures = [
            [["--no-preprocessor", "--no-color"], "hash-bang.js", "hash-bang.txt"],
            [["--allow-hash-bang"], "hash-bang.js"],
            [[], "compact.js", "pretty.json"],
            [["--compact"], "compact.js"],
            [[], "ecma.js", "ecma.txt"],
            [["--ecma", "6"], "ecma.js"],
            [["--locations"], "compact.js", "locations.json"],
            [["--macro", "FOO"], "macro1.js"],
            [["--macro", "[FOO, BAR=7]"], "macro2.js"],
            [["--no-objj"], "objj.j", "objj.txt"],
            [["--no-objj"], "no-objj.js"],
            [["--strict-semicolons"], "strict-semicolons.js", "strict-semicolons.txt"]
        ];

    cliFixtures.forEach(function(fixture)
    {
        var args = fixture[0].slice(),
            source = fixture[1],
            dest = fixture[2],
            baseDir = fixture[3] || "cli";

        if (!dest)
            dest = path.basename(source, path.extname(source)) + ".json";

        var basePath = path.join(fixturesPath, baseDir),
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
                return;
        }
        catch (ex)
        {
            // Don't do anything
        }

        args.push(sourcePath);

        var output = run(args, { parseOptions: { slice: 0 }}).output;

        fs.writeFileSync(destPath, output);
        console.log(baseDir + "/" + dest);
    });

    var through = require("through2").obj;

    return gulp.src(["test/fixtures/**/*.j"])
        .pipe($.changed("test/fixtures", { extension: ".json" }))
        .pipe(through(parseFixture))
        .pipe($.rename({ extname: ".json" }))
        .pipe(gulp.dest("test/fixtures"));
});

gulp.task("regenerate-fixtures", function(cb)
{
    runSequence("clean", "generate-fixtures", cb);
});

// Tests

gulp.task("mocha", function()
{
    return gulp.src("test/*.js")
        .pipe($.mocha({ reporter: "dot" }));
});

gulp.task("test", function(cb)
{
    runSequence("lint", "mocha", cb);
});
