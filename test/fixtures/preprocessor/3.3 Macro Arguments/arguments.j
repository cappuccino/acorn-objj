// Macros can take arguments

#define min(X, Y)  ((X) < (Y) ? (X) : (Y))

x = min(a, b);         // x = a < b ? a : b;
y = min(1, 2);         // y = 1 < 2 ? 1 : 2;
z = min(a + 28, p);    // z = a + 28 < p ? a + 28 : p;
