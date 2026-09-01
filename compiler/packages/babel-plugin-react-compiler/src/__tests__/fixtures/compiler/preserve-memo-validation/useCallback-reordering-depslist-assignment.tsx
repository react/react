// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useCallback} from 'react';
import {Stringify} from 'shared-runtime';

// We currently produce invalid output (incorrect scoping for `y` declaration)
function useFoo(arr1, arr2) {
  const x = [arr1];

  let y;
  const getVal = useCallback(() => {
    return {y};
  }, [((y = x.concat(arr2)), y)]);

  return <Stringify getVal={getVal} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [
    [1, 2],
    [3, 4],
  ],
};
