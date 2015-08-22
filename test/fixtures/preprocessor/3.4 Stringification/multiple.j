#define foo(arg) #arg + #arg

foo(bar);
// "bar" + "bar";
