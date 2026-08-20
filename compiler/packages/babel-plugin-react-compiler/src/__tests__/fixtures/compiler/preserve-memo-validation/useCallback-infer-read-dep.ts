// @validatePreserveExistingMemoizationGuarantees
import {useCallback} from 'react';
import {sum} from 'shared-runtime';

function useFoo() {
  const val = [1, 2, 3];

  return useCallback(() => {
    return sum(...val);
  }, [val]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};
