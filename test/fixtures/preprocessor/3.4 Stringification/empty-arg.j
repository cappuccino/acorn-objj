// Empty arg becomes empty string

#define stringify2(arg1, arg2)  #arg2

x = stringify2(foo,);
// x = "";
