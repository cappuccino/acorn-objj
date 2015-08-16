// Both named and variadic parameters may be used together

#define debuglog(format, ...)  if (debugging) console.log(format, __VA_ARGS__)

debuglog("%s: (%d, %d)", "foo", 13.27, 31.7);
// if (debugging)
//     console.log("%s: (%d, %d)", "foo", 13.27, 31.7);
