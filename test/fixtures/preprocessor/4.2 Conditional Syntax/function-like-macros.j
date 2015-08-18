// Function-like macros used without parens are considered 0
#define foo(arg) arg

#if foo
"failure";
#else
"success";
#endif
