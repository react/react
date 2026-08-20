/**
 * Test that we're not hoisting property reads from lambdas that are created to
 * pass to opaque functions, which often have maybe-invoke semantics.
 *
 * In this example, we shouldn't hoist `arr[0].value` out of the lambda.
 * ```js
 * e => arr[0].value + e.value  <-- created to pass to map
 * arr.map(<cb>)                <-- argument only invoked if array is non-empty
 * ```
 */
function useFoo({arr1, arr2}) {
  const x = arr1.map(e => arr1[0].value + e.value);
  const y = arr1.map(e => arr2[0].value + e.value);
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
