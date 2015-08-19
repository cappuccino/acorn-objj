// The preprocessor backslash-escapes quotes surrounding embedded string constants,
// and all backslashes within strings.

#define stringify(arg)  #arg

stringify(p = "foo\n");
// "p = \"foo\\n\"";

stringify(p = 'foo\n');
// "p = \'foo\\n\'";

stringify('bar	\n');
// "\'bar\t\\n\'";

stringify("bar	\n");
// '\"bar\t\\n\"'
