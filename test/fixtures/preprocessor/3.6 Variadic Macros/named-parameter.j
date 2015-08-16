// Variadic macros may also have named parameters, in which case varargs may be omitted

#define variadic(arg, ...)  arg __VA_ARGS__

x = variadic(7);
// x = 7;
