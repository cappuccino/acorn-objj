#define ref1 (4 + ref2)
#define ref2 (2 * ref1)

x = ref1;
// x = 4 + 2 * ref1;

y = ref2;
// y = 2 * (4 + ref2);
