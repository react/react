// @validatePreserveExistingMemoizationGuarantees
import {useMemo} from 'react';
import {identity} from 'shared-runtime';

function useFoo(data) {
  return useMemo(() => {
    const temp = identity(data.a);
    return {temp};
  }, [data.a]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{a: 2}],
};
