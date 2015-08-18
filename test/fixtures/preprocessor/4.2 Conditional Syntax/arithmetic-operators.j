// Arithmetic operators

// addition
#if 7 + 13
"success";
#else
"failure";
#endif

// subtraction
#if 13 - 7
"success";
#else
"failure";
#endif

#if 27 - 13 - 7 - 7
"failure";
#else
"success";
#endif

// multiplication
#if 2 * 7
"success";
#else
"failure";
#endif

#if 7 * 0
"failure";
#else
"success";
#endif

// Precedence works
#if 7 * 2 - 2  // (7 * 2) - 2
"success";
#else
"failure";
#endif

#if 7 - 1 * 7  // 7 - (1 * 7)
"failure";
#else
"success";
#endif

// division
// The result of division is truncated
#if 2 / 7
"failure";
#else
"success";
#endif

#if 7 / 2
"success";
#else
"failure";
#endif

// modulo
#if 27 % 13
"success";
#else
"failure";
#endif

#if 70 % 7
"failure";
#else
"success";
#endif

// true evaluates to 1
#if true - 1
"failure";
#else
"success";
#endif

// false evaluates to 0
#if false + 1
"success";
#else
"failure";
#endif
