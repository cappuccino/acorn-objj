// As with stringification, the actual argument is not macro-expanded first

#define foo 4
#define concatenate(arg1, arg2)  arg1 + arg1 ## arg2 ## 7

x = concatenate(foo, bar);
// x = 4 + foobar7;
