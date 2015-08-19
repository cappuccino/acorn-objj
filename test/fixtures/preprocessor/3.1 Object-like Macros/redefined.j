// Macros can be redefined

#define BUFSIZE 1024

foo = BUFSIZE;
// foo = 1024;

#undef BUFSIZE
#define BUFSIZE 1020
#define TABLESIZE BUFSIZE

foo = TABLESIZE;
// foo = 1020;

#undef BUFSIZE
#define BUFSIZE 37

foo = TABLESIZE;
// foo = 37;

// Redefining with the same definition does not warn
#define BUFSIZE 37

#define stringify(arg) #arg
#define stringify(arg) #arg
