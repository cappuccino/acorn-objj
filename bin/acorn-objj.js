#!/usr/bin/env node
"use strict";

var cli = require("../lib/cli.js");

process.exit(cli.run(process.argv));
