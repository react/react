// @enableNewMutationAliasingModel @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';

function useFoo(arr1, arr2) {
  const x = [arr1];

  let y;
  return useMemo(() => {
    return {y};
  }, [((y = x.concat(arr2)), y)]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [
    [1, 2],
    [3, 4],
  ],
};
