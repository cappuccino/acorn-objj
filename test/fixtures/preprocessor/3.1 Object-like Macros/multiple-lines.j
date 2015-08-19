// Macros may span multiple lines

#define NUMBERS 1, \
                2, \
                3

x = [NUMBERS];
// x = [1, 2, 3];

#define ROUND(v, n) \
if (n - Math.floor(n) >= 0.5) \
    v = Math.floor(n); \
else \
    v = Math.ceil(n);

ROUND(x, 13.27)

// Make sure \ outside of macro has normal meaning
\u0067ood = "good";
