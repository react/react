function useHook(a, b) {
  let z = {a};
  let y = b;
  let x = function () {
    if (y) {
      // we don't know for sure this mutates, so we should assume
      // that there is no mutation so long as `x` isn't called
      // during render
      maybeMutate(z);
    }
  };
  return x;
}
