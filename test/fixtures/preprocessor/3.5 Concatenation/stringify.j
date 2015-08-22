// Concatenated args can be stringified
#define test(arg1, arg2) arg1 ## #arg2

test(, foo);
// "foo";
