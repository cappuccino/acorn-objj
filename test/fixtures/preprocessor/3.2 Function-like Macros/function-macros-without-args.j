// Function macros used without args are not expanded

function foobar() { console.log("out of line"); }

#define foobar()  console.log("inline")

foobar();
// console.log("inline");

funcptr = foobar;
// funcptr = foobar
