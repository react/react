/**
 * Forked from array-map-simple.js
 *
 * Whether lambdas are named or passed inline shouldn't affect whether we expect
 * it to be called.
 */
function useFoo({arr1, arr2}) {
  const cb1 = e => arr1[0].value + e.value;
  const x = arr1.map(cb1);
  const cb2 = e => arr2[0].value + e.value;
  const y = arr1.map(cb2);
  return [x, y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{arr1: [], arr2: []}],
  sequentialRenders: [
    {arr1: [], arr2: []},
    {arr1: [], arr2: null},
    {arr1: [{value: 1}, {value: 2}], arr2: [{value: -1}]},
  ],
};
