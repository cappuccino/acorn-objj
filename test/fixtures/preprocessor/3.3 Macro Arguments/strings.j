// Macro parameters appearing inside string literals are not replaced by their corresponding actual arguments

#define literal(arg)  arg; "arg"

literal(test);
// test;
// "arg";
