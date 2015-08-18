#if FOO
"failure";
#else
"success";
#endif

#define FOO 1

#if FOO
"success";
#else
"failure";
#endif
