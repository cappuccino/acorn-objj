#if __OBJJ__
"success";

    #ifdef __NODE__
    __NODE__
    #else
    "failure"
    #endif
#else
"failure"
#endif
