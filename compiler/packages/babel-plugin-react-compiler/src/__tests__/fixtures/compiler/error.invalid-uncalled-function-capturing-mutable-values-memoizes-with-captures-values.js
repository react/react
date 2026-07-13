// @flow @enableNewMutationAliasingModel @enablePreserveExistingMemoizationGuarantees:false
/**
 * This hook returns a function that when called with an input object,
 * will return the result of mapping that input with the supplied map
 * function. Results are cached, so if the same input is passed again,
 * the same output object will be returned.
 *
 * Note that this technically violates the rules of React and is unsafe:
 * hooks must return immutable objects and be pure, and a function which
 * captures and mutates a value when called is inherently not pure.
 *
 * However, in this case it is technically safe _if_ the mapping function
 * is pure *and* the resulting objects are never modified. This is because
 * the function only caches: the result of `returnedFunction(someInput)`
 * strictly depends on `returnedFunction` and `someInput`, and cannot
 * otherwise change over time.
 */
hook useMemoMap<TInput: interface {}, TOutput>(
  map: TInput => TOutput
): TInput => TOutput {
  return useMemo(() => {
    // The original issue is that `cache` was not memoized together with the returned
    // function. This was because neither appears to ever be mutated — the function
    // is known to mutate `cache` but the function isn't called.
    //
    // The fix is to detect cases like this — functions that are mutable but not called -
    // and ensure that their mutable captures are aliased together into the same scope.
    const cache = new WeakMap<TInput, TOutput>();
    return input => {
      let output = cache.get(input);
      if (output == null) {
        output = map(input);
        cache.set(input, output);
      }
      return output;
    };
  }, [map]);
}
