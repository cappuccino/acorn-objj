// If the pasted token is invalid, a warning is issued and the two tokens are left as is

#define paste_fail(arg1, arg2)  arg1 ## arg2

x = paste_fail("paste", + "me");
// x = "paste" + "me";
