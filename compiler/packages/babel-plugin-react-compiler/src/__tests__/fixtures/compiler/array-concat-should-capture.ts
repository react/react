import {mutate} from 'shared-runtime';

/**
 * Fixture showing why `concat` needs to capture both the callee and rest args.
 * Here, observe that arr1's values are captured into arr2.
 *  - Later mutations of arr2 may write to values within arr1.
 *  - Observe that it's technically valid to separately memoize the array arr1
 *    itself.
 */
function Foo({inputNum}) {
  const arr1: Array<number | object> = [{a: 1}, {}];
  const arr2 = arr1.concat([1, inputNum]);
  mutate(arr2[0]);
  return arr2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{inputNum: 2}],
  sequentialRenders: [{inputNum: 2}, {inputNum: 3}],
};
