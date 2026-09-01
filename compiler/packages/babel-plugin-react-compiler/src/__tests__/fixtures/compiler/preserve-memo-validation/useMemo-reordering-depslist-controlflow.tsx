// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';
import {Stringify} from 'shared-runtime';

function Foo({arr1, arr2, foo}) {
  const x = [arr1];

  let y = [];

  const val1 = useMemo(() => {
    return {x: 2};
  }, []);

  const val2 = useMemo(() => {
    return [y];
  }, [foo ? (y = x.concat(arr2)) : y]);

  return <Stringify val1={val1} val2={val2} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{arr1: [1, 2], arr2: [3, 4], foo: true}],
  sequentialRenders: [
    {arr1: [1, 2], arr2: [3, 4], foo: true},
    {arr1: [1, 2], arr2: [3, 4], foo: false},
  ],
};
