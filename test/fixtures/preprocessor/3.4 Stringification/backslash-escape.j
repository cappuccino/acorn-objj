// The preprocessor backslash-escapes the quotes surrounding embedded string constants,
// and all backslashes within string and character constants

#define stringify(arg)  #arg

x = stringify(p = "foo\n");
// x = "p = \"foo\\n\"";

x = stringify(p = 'foo\n');
// x = "p = 'foo\\n'";
