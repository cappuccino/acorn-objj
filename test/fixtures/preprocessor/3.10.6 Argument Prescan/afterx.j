#define AFTERX(x) X_ ## x
#define XAFTERX(x) AFTERX(x)
#define TABLESIZE 1024
#define BUFSIZE TABLESIZE

var a = AFTERX(BUFSIZE),
    b = XAFTERX(BUFSIZE);
// var a = X_BUFSIZE,
//     b = X_1024;
