// @validatePreserveExistingMemoizationGuarantees

import {useMemo} from 'react';
import {identity} from 'shared-runtime';

function useFoo(cond) {
  useMemo(() => {
    if (cond) {
      return 2;
    } else {
      return identity(5);
    }
  }, [cond]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [true],
};
