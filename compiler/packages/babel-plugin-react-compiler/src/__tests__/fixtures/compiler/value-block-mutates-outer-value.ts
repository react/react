import {makeArray, useHook} from 'shared-runtime';

/**
 * Here, the cond ? [...] : defaultList value block produces two
 * new values (each with its own scope):
 *   $0 = ["text"]
 *   $1 = { text: $0 }
 * The same value block also mutates customList, so it must be
 * merged with the scope producing customList
 */
function Foo({defaultList, cond}) {
  const comparator = (a, b) => a - b;
  useHook();
  const customList = makeArray(1, 5, 2);
  useHook();
  const result = cond
    ? [...customList.sort(comparator), {text: ['text']}]
    : defaultList;

  return result;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{defaultList: [2, 4], cond: true}],
};
