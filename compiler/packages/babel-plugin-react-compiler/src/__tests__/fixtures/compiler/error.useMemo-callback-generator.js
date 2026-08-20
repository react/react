function component(a, b) {
  // we don't handle generators at all so this test isn't
  // useful for now, but adding this test in case we do
  // add support for generators in the future.
  let x = useMemo(function* () {
    yield a;
  }, []);
  return x;
}
