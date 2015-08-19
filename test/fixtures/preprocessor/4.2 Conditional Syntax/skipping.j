#if 0
#if 1
#define FOO
#undef FOO
#warning "warning"
#error "error"
#endif
#endif

#if 1
#else
#define FOO
#undef FOO
#warning "warning"
#error "error"
#endif
