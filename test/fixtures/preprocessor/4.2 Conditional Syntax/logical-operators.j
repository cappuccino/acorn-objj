// #if with arithmetic and logical OR operators. Only the last test in the expression succeeds.
#if (1 + 1 == 3) || (2 - 1 == 0) || (2 * 2 === 5) || (2 / 2 === 2) || (3 % 2 === 1)
"success";
#else
"failure";
#endif

// #if with arithmetic and logical AND operators. All of the tests in the expression succeed.
#if (1 + 1 === 2) && (2 - 1 === 1) && (2 * 2 === 4) && (2 / 2 === 1) && (3 % 2 === 1)
"success";
#else
"failure";
#endif

// #if with arithmetic and logical AND operators. All of the tests except the last in the expression succeed.
#if (1 + 1 == 2) && (2 - 1 == 1) && (2 * 2 === 4) && (2 / 2 === 1) && (3 % 2 === 0)
"failure";
#else
"success";
#endif

// #if with bitwise and logical AND operators. All of the tests in the expression succeed.
#if ((3 & 1) === 1) && ((3 | 0) === 3) && ((3 ^ 3) === 0) && (~1 === -2) && (1 << 2 === 4) && (-2 >> 1 === -1) && (-2 >>> 1 === 2147483647)
"success";
#else
"failure";
#endif

// #if with comparison and logical AND operators. All of the tests in the expression succeed.
#if (7 == 7) && (7 === "7") && (7 === 7) && (7 != 13) && (7 != "13") && (7 !== 13) && (13 > 7) && (13 >= 13) && (13 < 27) && (27 <= 27)
"success";
#else
"failure";
#endif
