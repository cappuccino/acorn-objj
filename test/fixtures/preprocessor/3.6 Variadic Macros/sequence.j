// varargs can be effectively be a sequence statement

#define variadic(...)  __VA_ARGS__

variadic(var x = 1, y = 2, z = 3);
// var x = 1,
//     y = 2,
//     z = 3;
