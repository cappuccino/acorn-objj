@implementation Self

- (id)init
{
    self = [super init];

    if (self)
        [self doSomething];

    return self;
}

@end

function test()
{
    // This is legal outside of an objj method
    var self = 7;
}
