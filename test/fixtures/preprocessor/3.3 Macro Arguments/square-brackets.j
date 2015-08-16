// Square braces do not have to balance in macro arguments

#define square_brackets(arg1, arg2)  arg1 ## arg2

a = square_brackets([x, y]);
// a = [xy];
