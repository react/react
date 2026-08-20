import {createHookWrapper} from 'shared-runtime';

function useFoo({arr1}) {
  const cb1 = e => arr1[0].value + e.value;
  const x = arr1.map(cb1);
  return [x, cb1];
}

export const FIXTURE_ENTRYPOINT = {
  fn: createHookWrapper(useFoo),
  params: [{arr1: [], arr2: []}],
  sequentialRenders: [
    {arr1: [], arr2: []},
    {arr1: [], arr2: null},
    {arr1: [{value: 1}, {value: 2}], arr2: [{value: -1}]},
  ],
};
