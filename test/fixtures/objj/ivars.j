@implementation Empty
{}
@end

@implementation Foo
{
    // Types
    float f;
    double d;
    BOOL bool;
    SEL sel;
    JSObject js;

    char c;
    signed char sc;
    unsigned char uc;

    byte b;
    signed byte sb;
    unsigned byte ub;

    short s;
    signed short ss;
    unsigned short us;

    int i;
    signed int si;
    unsigned int ui;

    long l;
    signed long l;
    unsigned long ul;

    long int li;
    signed long int sli;
    unsigned long int uli;

    long long ll;
    signed long long sll;
    unsigned long long ull;

    CPTextView text;
    void v;

    id someId;
    id<CPText> textId;
    id<CPText, CPView> textId;

    @outlet CPTextView firstName;
    IBOutlet CPTextView lastName;
}

@end
