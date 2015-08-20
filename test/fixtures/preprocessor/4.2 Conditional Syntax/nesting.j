"start";

#if __OBJJ__
"success";

    #ifdef FOO
    "failure";
    #elif defined(BAR)
    "failure";
    #elif defined __NODE__
    __NODE__
    #else
    "failure"
    #endif

#elif defined __BROWSER__
"failure";
#else
"failure"
#endif

"end";
