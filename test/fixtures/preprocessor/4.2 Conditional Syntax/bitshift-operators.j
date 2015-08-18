#if 3 >> 1
"success";
#else
"failure";
#endif

#if 2 >> 7
"failure";
#else
"success";
#endif

#if 3 >>> 1
"success";
#else
"failure";
#endif

#if 2 >>> 7
"failure";
#else
"success";
#endif

#if 2 << 7
"success";
#else
"failure";
#endif

#if 0 << 7
"failure";
#else
"success";
#endif
