// If the argument is empty, that `##' has no effect

#define foo 27
#define concatenate(arg1, arg2)  arg1 + arg1 ## arg2 ## 7

x = concatenate(foo, );
// x = 27 + foo7;

#define empty(arg1, arg2) arg1 ## arg2

empty(,);
// ;
