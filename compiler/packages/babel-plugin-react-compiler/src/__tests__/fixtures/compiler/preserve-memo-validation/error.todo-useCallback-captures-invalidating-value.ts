// @validatePreserveExistingMemoizationGuarantees

import {useCallback} from 'react';

// False positive:
// We currently bail out on this because we don't understand
// that `() => [x]` gets pruned because `x` always invalidates.
function useFoo(props) {
  const x = [];
  useHook();
  x.push(props);

  return useCallback(() => [x], [x]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{}],
};
