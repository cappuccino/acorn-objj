// The variadic parameters may be named

#define variadic(args...) console.log(args);

variadic("(%d, %d)", x, y);
// console.log("(%d, %d)", x, y);
