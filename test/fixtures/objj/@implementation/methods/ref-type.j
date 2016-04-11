@implementation Test

- (void)takeARef:(@ref)ref refWithType:(@ref<int>)refWithType
{
}

- (void)sendRef
{
    var x;

    [self takeARef:@ref(x) refWithType:@ref(x)];
}

@end
