// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false

import {useCallback} from 'react';

// It's correct to produce memo blocks with fewer deps than source
function useFoo(a, b) {
  return useCallback(() => [a], [a, b]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [1, 2],
};
