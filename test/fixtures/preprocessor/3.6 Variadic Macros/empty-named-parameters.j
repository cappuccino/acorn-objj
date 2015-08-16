// Named parameters may be empty in the arguments

#define ignore_args(arg1, arg2, ...)  arg1 arg2 someFunction(__VA_ARGS__)

ignore_args(, , "foo", 13);
// someFunction("foo", 13);
