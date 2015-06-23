@implementation Foo
@end

@implementation Foo : Bar
@end

@implementation Foo (Bar)
@end

@implementation Foo : Bar <CPFoo, CPBar>
@end
