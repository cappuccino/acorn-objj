#define COMMAND(NAME)  { name: #NAME, command: NAME ## _command }

x = COMMAND(foo);
// x = { name: "foo", command: foo_command };
