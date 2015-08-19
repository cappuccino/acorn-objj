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

// Keywords are treated as plain names
#if if
"failure";
#else
"success";
#endif

#if if + 1
"success";
#else
"failure";
#endif

#if @implementation
"failure";
#else
"success"
#endif
