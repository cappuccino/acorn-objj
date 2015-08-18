#define FOO

#if defined(FOO)
"success";
#else
"failure";
#endif

#if defined FOO
"success";
#else
"failure";
#endif

#if 7 < 13 && defined FOO && 27 > 13
"success";
#else
"failure";
#endif

#if 7 < 13 && !defined BAR && 27 > 13
"success";
#else
"failure";
#endif
