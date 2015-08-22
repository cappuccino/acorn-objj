// Operators can be created
#define makeAssignOperator(plusMinus) plusMinus ## =
#define testOp(varName, plusMinus, value) varName makeAssignOperator(plusMinus) value

testOp(a, +, 2);
// a += 2;

// Numbers can be created
#define makeFloat(integer, fraction) integer ## . ## fraction

makeFloat(7, 27);
// 7.27;

#define makeScientific(coefficient, exponent)  (827 - 413) / coefficient ## e ## exponent + 13

makeScientific(7, 27);
// (827 - 413) / 7e+27 + 13;
