// @validatePreserveExistingMemoizationGuarantees @enablePreserveExistingMemoizationGuarantees:false

import {identity, Stringify, useHook} from 'shared-runtime';

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
 */
function useInputValue(input) {
  // Conflate the `identity(input, x)` call with something outside the useMemo,
  // to try and break memoization of `value`. This gets correctly flagged since
  // the dependency is being mutated
  let x = {};
  useHook();
  const object = React.useMemo(() => {
    const {value} = identity(input, x);
    return {value};
  }, [input, x]);
  return object;
}

function Component() {
  return <Stringify value={useInputValue({value: 42}).value} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
