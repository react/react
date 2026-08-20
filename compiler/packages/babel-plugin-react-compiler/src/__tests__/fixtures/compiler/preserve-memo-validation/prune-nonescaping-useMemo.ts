// @validatePreserveExistingMemoizationGuarantees

import {useMemo} from 'react';
import {identity} from 'shared-runtime';

/**
 * This is technically a false positive, although it makes sense
 * to bailout as source code might be doing something sketchy.
 */
function useFoo(x) {
  useMemo(() => identity(x), [x]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [2],
};
