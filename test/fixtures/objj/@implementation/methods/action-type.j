@implementation Foo

// Type in addition to @action is legal
- (@action double)someOtherAction
{
}

- (IBAction double)someOtherAction
{
}

@end
