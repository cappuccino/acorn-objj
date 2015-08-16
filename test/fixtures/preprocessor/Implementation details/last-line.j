// Macro invocation should work at end of file
#define FOO(arg) "foo" + arg
#define BAR "bar"

foo = FOO(BAR);
