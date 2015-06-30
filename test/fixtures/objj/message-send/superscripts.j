// The parser sees this as `test[i][foo];`
test[i]
[foo];

// The parser sees this as `test[i]` with an implicit semicolon,
// followed by a message send as the next statement.
test[i]
[foo bar];
