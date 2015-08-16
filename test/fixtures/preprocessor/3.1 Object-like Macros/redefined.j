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
