// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false

import {useMemo} from 'react';

// Todo: we currently only generate a `constVal` declaration when
// validatePreserveExistingMemoizationGuarantees is enabled, as the
// StartMemoize instruction uses `constVal`.
// Fix is to rewrite StartMemoize instructions to remove constant
// propagated values
function useFoo() {
  const constVal = 0;

  return useMemo(() => [constVal], [constVal]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{}],
};
