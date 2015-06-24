@protocol Foo
@end

@protocol Foo <>
@end

@protocol Foo <Bar>
@end

@protocol Foo <Bar, Baz>
@end

@protocol Foo

- (void)foo;

@end

@protocol Foo

@optional
- (void)foo;
- (void)bar;

@end

@protocol Foo

@required
- (void)foo;
- (void)bar;

@end

@protocol Foo

@optional
- (void)foo;
- (void)bar;

@required
- (void)req1;
- (void)req2;

@end
