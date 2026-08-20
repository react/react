// @validatePreserveExistingMemoizationGuarantees:true

import {useCallback} from 'react';
import {Stringify, useIdentity} from 'shared-runtime';

/**
 * Here, the *inferred* dependencies of cb are `a` and `t1 = LoadContext capture x_@1`.
 * - t1 does not have a scope as it captures `x` after x's mutable range
 * - `x` is a context variable, which means its mutable range extends to all
 *    references / aliases.
 * - `a`, `b`, and `x` get the same mutable range due to potential aliasing.
 *
 * We currently bail out because `a` has a scope and is not transitively memoized
 * (as its scope is pruned due to a hook call)
 */
function useBar({a, b}, cond) {
  let x = useIdentity({val: 3});
  if (cond) {
    x = b;
  }

  const cb = useCallback(() => {
    return [a, x];
  }, [a, x]);

  return <Stringify cb={cb} shouldInvoke={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useBar,
  params: [{a: 1, b: 2}, true],
};
