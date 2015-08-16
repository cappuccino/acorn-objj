// Comments may be used anywhere within a macro

#define COMMENTS(/* an arg */ arg) /* one */ arg /* two */ * 7 /*
three */ + 1

x = /* before */ COMMENTS(13) /* after */;
// x = 13 * 7 + 1;
