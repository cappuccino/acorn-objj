#define foo(arg) -arg
#define increment(arg) (arg) + 1

#if foo(1) + 1
"failure";
#else
"success";
#endif

#if foo(-7) - 7
"failure";
#else
"success";
#endif

#if foo(1)
"success";
#else
"failure";
#endif

#if increment(0)
"success";
#else
"failure";
#endif

#if increment(-1)
"failure";
#else
"success";
#endif
