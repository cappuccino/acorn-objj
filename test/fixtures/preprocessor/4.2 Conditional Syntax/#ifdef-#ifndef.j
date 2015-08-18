// #ifdef fails if macro is undefined, succeeds if it is defined. #ifndef does the opposite.
#ifdef FOO
"failure";
#endif

#ifndef FOO
"success";
#endif

#define BAR

#ifdef BAR
"success";
#endif

#ifndef BAR
"failure";
#endif

#ifdef __OBJJ__
"success";
#endif

#ifndef __OBJJ__
"failure";
#endif
