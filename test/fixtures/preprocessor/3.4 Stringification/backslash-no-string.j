// Backslashes that are not inside string or character constants are not duplicated

#define stringify(arg)  #arg

x = stringify("foo	bar");
// x = "\"foo\tbar\"";
