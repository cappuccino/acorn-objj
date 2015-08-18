#if +7
"success";
#else
"failure";
#endif

#if +0
"failure";
#else
"success";
#endif

#if -7
"success";
#else
"failure";
#endif

#if -0
"failure";
#else
"success";
#endif

#if !0
"success";
#else
"failure";
#endif

#if !7
"failure";
#else
"success";
#endif

#if ~1
"success";
#else
"failure";
#endif

#if ~-1
"failure";
#else
"success";
#endif

#if !~-1
"success";
#else
"failure";
#endif
