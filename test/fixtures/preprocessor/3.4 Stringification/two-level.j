// If you want to stringify the result of expansion of a macro argument,
// you have to use two levels of macros.

#define xstr(s) str(s)
#define str(s) #s
#define foo 4

x = str (foo);
// x = "foo";

x = xstr (foo);
// x = "4";
