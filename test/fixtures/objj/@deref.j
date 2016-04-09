function test(ref)
{
    ++@deref(ref);
    @deref(ref) = 7;
    @deref(ref) += 13;
}
