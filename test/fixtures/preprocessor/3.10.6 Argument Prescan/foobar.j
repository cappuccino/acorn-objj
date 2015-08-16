#define foo  (a,b)
#define bar(x) lose(x)
#define lose(x) (1 + (x))

bar(foo);
// 1 + (a, b);

#undef foo
#undef bar
#define foo  a,b
#define bar(x) lose((x))

bar(foo);
// 1 + (a, b);
