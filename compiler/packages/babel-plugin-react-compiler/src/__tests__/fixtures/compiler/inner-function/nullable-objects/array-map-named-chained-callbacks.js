/**
 * Forked from array-map-simple.js
 *
 * Here, getVal1 has a known callsite in `cb1`, but `cb1` isn't known to be
 * called (it's only passed to array.map). In this case, we should be
 * conservative and assume that all named lambdas are conditionally called.
 */
function useFoo({arr1, arr2}) {
  const getVal1 = () => arr1[0].value;
  const cb1 = e => getVal1() + e.value;
  const x = arr1.map(cb1);
  const getVal2 = () => arr2[0].value;
  const cb2 = e => getVal2() + e.value;
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
