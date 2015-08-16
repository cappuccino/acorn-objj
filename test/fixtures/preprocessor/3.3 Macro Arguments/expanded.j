// Arguments are macro-expanded before substitution

#define min(X, Y)  ((X) < (Y) ? (X) : (Y))
#define DOUBLE(arg)  (arg) * 2

x = min(DOUBLE(a), 10);
// x = a * 2 < 10 ? a * 2 : 10;
