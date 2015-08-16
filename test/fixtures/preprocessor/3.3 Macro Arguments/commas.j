// Commas may be within arguments

#define comma(arg)  arg;

comma((x = 0, y = 1));
// (x = 0, y = 1);
