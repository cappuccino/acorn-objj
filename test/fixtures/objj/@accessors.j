@implementation Foo
{
    int plainAccessors @accessors;
    int emptyAccessors @accessors();
    int getter @accessors(getter=getMe);
    int getter @accessors(setter=setMe);
    int getter @accessors(setter=setMe:);
    int getter @accessors(property=me);
    int getter @accessors(getter=getMe, setter=setMe);
    int getter @accessors(readonly);
    int getter @accessors(readonly, property=me);
    int getter @accessors(readwrite, copy, getter=getMe, setter=setMe);
}

@end
