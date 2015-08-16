// After substitution, the complete text is scanned again for macros
// to expand, including the arguments

#define DOUBLE(arg)  (arg) * 2
#define QUADRUPLE(arg)  DOUBLE(arg) * 2

x = QUADRUPLE(7);
// ==> x = DOUBLE(7) * 2;
// x = 7 * 2 * 2;

#define paste_arg(arg1, arg2)  arg1 ## arg2

x = paste_arg(QUAD, RUPLE(7));
// ==> x = QUAD ## RUPLE(7);
// ==> x = QUADRUPLE(7);
// x = 7 * 2 * 2;
