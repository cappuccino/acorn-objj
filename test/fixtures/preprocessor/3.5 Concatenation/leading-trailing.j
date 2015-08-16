// Only the trailing token on the left and leading token on the right are pasted

#define foo 4
#define concatenate(arg1, arg2)  arg1 + arg1 ## arg2 ## 7

x = concatenate(foo + 1, 7 + foo);
// x = 4 + 1 + 4 + 17 + foo7;
