// @validatePreserveExistingMemoizationGuarantees

import {identity, Stringify} from 'shared-runtime';

/**
 * Repro from https://github.com/facebook/react/issues/34262
 *
 * The compiler memoizes more precisely than the original code, with two reactive scopes:
 * - One for `transform(input)` with `input` as dep
 * - One for `{value}` with `value` as dep
 *
 * Previously ValidatePreservedManualMemoization rejected this input, because
 * the original memoization had `object` depending on `input` but we split the scope per above,
 * and the scope for the FinishMemoize instruction is the second scope which depends on `value`
 */
function useInputValue(input) {
  const object = React.useMemo(() => {
    const {value} = identity(input);
    return {value};
  }, [input]);
  return object;
}

function Component() {
  return <Stringify value={useInputValue({value: 42}).value} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
