// If the argument is empty, that `##' has no effect

#define foo 4
#define concatenate(arg1, arg2)  arg1 + arg1 ## arg2 ## 7

x = concatenate(foo, );
// x = 4 + foo7;
