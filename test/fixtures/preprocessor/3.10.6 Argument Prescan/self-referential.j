#define test(arg) arg
#define foo foo + 7
test(foo)

// 1st pass:
// => foo
// => foo + 7   // foo token is marked as selfReferential, so it won’t be expanded in the 2nd pass

// 2nd pass:
// => foo + 7
