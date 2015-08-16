// Leading and trailing whitespace is trimmed,
// whitespace between tokens is reduced to single space

#define min(X, Y)  ((X) < (Y) ? (X) : (Y))

x = min(  a   +   7,
         b
         -
         13  );
// x = a + 7 < b - 13 ? a + 7 : b - 13;
