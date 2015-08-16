// All leading and trailing whitespace in text being stringified is ignored.
// Any sequence of whitespace in the middle of the text is converted to a single space
// in the stringified result.

#define stringify(arg)  #arg

x = stringify(   foo  =
                '  b a r  '   );
// x = "foo = '  b a r  '";
