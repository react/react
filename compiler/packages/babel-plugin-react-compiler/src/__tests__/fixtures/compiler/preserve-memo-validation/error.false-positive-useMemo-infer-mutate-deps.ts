// @validatePreserveExistingMemoizationGuarantees @enablePreserveExistingMemoizationGuarantees:false
import {useMemo} from 'react';
import {identity} from 'shared-runtime';

// This is a false positive as Forget's inferred memoization
// invalidates strictly less than source. We currently do not
// track transitive deps / invalidations of manual memo deps
// because of implementation complexity
function useFoo() {
  const val = [1, 2, 3];

  return useMemo(() => {
    return identity(val);
  }, [val]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};
