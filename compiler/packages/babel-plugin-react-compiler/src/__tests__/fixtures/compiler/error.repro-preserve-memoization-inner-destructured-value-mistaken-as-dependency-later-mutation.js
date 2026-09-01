// @validatePreserveExistingMemoizationGuarantees @enablePreserveExistingMemoizationGuarantees:false

/**
 * Repro from https://github.com/facebook/react/issues/34262
 *
 * The compiler memoizes more precisely than the original code, with two reactive scopes:
 * - One for `transform(input)` with `input` as dep
 * - One for `{value}` with `value` as dep
 *
 * When we validate preserving manual memoization we incorrectly reject this, because
 * the original memoization had `object` depending on `input` but our scope depends on
 * `value`.
 *
 * This fixture adds a later potential mutation, which extends the scope and should
 * fail validation. This confirms that even though we allow the dependency to diverge,
 * we still check that the output value is memoized.
 */
function useInputValue(input) {
  const object = React.useMemo(() => {
    const {value} = transform(input);
    return {value};
  }, [input]);
  mutate(object);
  return object;
}
