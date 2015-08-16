// Args are macro-expanded

#define expand_args(...)  someFunction(__VA_ARGS__)
#define increment(arg)  arg + 1

expand_args("foo", increment(7), 13);
// someFunction("foo", 7 + 1, 13);
