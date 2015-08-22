// Only the tokens immediately adjacent to ## are pasted

#define foo 27
#define concatenate(arg1, arg2)  arg1 + arg1 ## arg2 ## 7

x = concatenate(foo + 1 / 13, 7 + bar + foo);

// Step 1: argument substitution
// => x = [foo + 1 / 13] + [foo + 1 / 13] ## [7 + bar + foo] ## 7

// Step 2: pasting
// => x = foo + 1 / 13 + foo + 1 / 137 + bar + foo7

// Step 3: expansion
// => x = 27 + 1 / 13 + 27 + 1 / 137 + bar + foo7
