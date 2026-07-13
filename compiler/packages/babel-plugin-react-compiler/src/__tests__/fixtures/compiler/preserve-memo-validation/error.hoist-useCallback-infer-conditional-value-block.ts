// @validatePreserveExistingMemoizationGuarantees @enablePreserveExistingMemoizationGuarantees:false
import {useCallback} from 'react';
import {identity, mutate} from 'shared-runtime';

function useHook(propA, propB) {
  return useCallback(() => {
    const x = {};
    if (identity(null) ?? propA.a) {
      mutate(x);
      return {
        value: propB.x.y,
      };
    }
  }, [propA.a, propB.x.y]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [{a: 1}, {x: {y: 3}}],
};
