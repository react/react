// @validatePreserveExistingMemoizationGuarantees

import {useCallback} from 'react';

// More specific memoization always results in fewer memo block
// executions.
// Precisely:
//  x_new != x_prev does NOT imply x.y.z_new != x.y.z_prev
//  x.y.z_new != x.y.z_prev does imply x_new != x_prev
function useHook(x) {
  return useCallback(() => [x.y.z], [x]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [{y: {z: 2}}],
};
