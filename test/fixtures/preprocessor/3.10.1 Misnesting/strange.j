// Macro definitions and arguments do not have to have balanced parentheses
#define strange(file) fprintf (file, "%s %d",

strange(stderr) p, 35);
// fprintf(stderr, "%s %d", p, 35);
