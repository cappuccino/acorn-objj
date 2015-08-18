#if 7 & 0
"failure";
#else
"success";
#endif

#if 2 & 7
"success";
#else
"failure";
#endif

#if 7 | 0
"success";
#else
"failure";
#endif

#if 0 | 0
"failure";
#else
"success";
#endif

#if 1 ^ 0
"success";
#else
"failure";
#endif

#if 1 ^ 1
"failure";
#else
"success";
#endif
