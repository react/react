// @validatePreserveExistingMemoizationGuarantees

import {useMemo} from 'react';

// Here, Forget infers that the memo block dependency is input1
// 1. StartMemoize is emitted before the function expression
//    (and thus before the depslist arg and its rvalues)
// 2. x and y's overlapping reactive scopes forces y's reactive
//    scope to be extended to after the `mutate(x)` call, after
//    the StartMemoize instruction.
// While this is technically a false positive, this example would
// already fail the exhaustive-deps eslint rule.
function useFoo(input1) {
  const x = {};
  const y = [input1];
  const memoized = useMemo(() => {
    return [y];
  }, [(mutate(x), y)]);

  return [x, memoized];
}
