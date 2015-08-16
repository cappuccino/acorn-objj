// ## between a comma and the variadic parameter name allows the variadic args to be omitted

#define emptyVariadic(format, args...) console.log(format, ##args)

emptyVariadic("(%d, %d)", x, y);
// console.log("(%d, %d)", x, y);

emptyVariadic("(%d, %d)");
// console.log("(%d, %d)");
