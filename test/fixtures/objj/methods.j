@implementation Foo

+ (void)initialize
{
}

- (Foo)init
{
    var foo = 7;
}

- (instancetype)initWithBytes:(void)bytes length:(NSUInteger)length encoding:(NSStringEncoding)encoding
{
}

// No return type is legal
- noReturnType
{
}

- (@action)someAction
{
}

- (IBAction)ibAction
{
}

// Type in addition to @action is legal
- (@action double)someOtherAction
{
}

// Empty selector is legal
- (void)initWithFoo:(int)foo :(double)bar
{
}

// No type is legal
- (void)initWithFoo:foo
{
}

// Variable args
- (void)variable:(int)v, ...
{
}

@end
