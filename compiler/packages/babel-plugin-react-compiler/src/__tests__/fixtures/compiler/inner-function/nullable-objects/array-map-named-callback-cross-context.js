import {Stringify} from 'shared-runtime';

/**
 * Forked from array-map-simple.js
 *
 * Named lambdas (e.g. cb1) may be defined in the top scope of a function and
 * used in a different lambda (getArrMap1).
 *
 * Here, we should try to determine if cb1 is actually called. In this case:
 * - getArrMap1 is assumed to be called as it's passed to JSX
 * - cb1 is not assumed to be called since it's only used as a call operand
 */
function useFoo({arr1, arr2}) {
  const cb1 = e => arr1[0].value + e.value;
  const getArrMap1 = () => arr1.map(cb1);
  const cb2 = e => arr2[0].value + e.value;
  const getArrMap2 = () => arr1.map(cb2);
  return (
    <Stringify
      getArrMap1={getArrMap1}
      getArrMap2={getArrMap2}
      shouldInvokeFns={true}
    />
  );
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
