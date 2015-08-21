// Concatenation should work when there are no macro parameters

#define test 1 ## 2 ## 3

test;
// 123;
