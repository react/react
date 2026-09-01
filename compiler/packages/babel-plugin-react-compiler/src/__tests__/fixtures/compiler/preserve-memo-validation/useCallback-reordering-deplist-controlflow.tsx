// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useCallback} from 'react';
import {Stringify} from 'shared-runtime';

function Foo({arr1, arr2, foo}) {
  const x = [arr1];

  let y = [];

  const getVal1 = useCallback(() => {
    return {x: 2};
  }, []);

  const getVal2 = useCallback(() => {
    return [y];
  }, [foo ? (y = x.concat(arr2)) : y]);

  return <Stringify val1={getVal1} val2={getVal2} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{arr1: [1, 2], arr2: [3, 4], foo: true}],
  sequentialRenders: [
    {arr1: [1, 2], arr2: [3, 4], foo: true},
    {arr1: [1, 2], arr2: [3, 4], foo: false},
  ],
};
