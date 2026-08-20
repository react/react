import {useRef, useEffect} from 'react';

/**
 * The postfix increment operator should return the value before incrementing.
 * ```js
 * const id = count.current; // 0
 * count.current = count.current + 1; // 1
 * return id;
 * ```
 * The bug is that we currently increment the value before the expression is evaluated.
 * This bug does not trigger when the incremented value is a plain primitive.
 *
 * Found differences in evaluator results
 * Non-forget (expected):
 * (kind: ok) {"count":{"current":0},"updateCountPostfix":"[[ function params=0 ]]","updateCountPrefix":"[[ function params=0 ]]"}
 * logs: ['id = 0','count = 1']
 * Forget:
 * (kind: ok) {"count":{"current":0},"updateCountPostfix":"[[ function params=0 ]]","updateCountPrefix":"[[ function params=0 ]]"}
 * logs: ['id = 1','count = 1']
 */
function useFoo() {
  const count = useRef(0);
  const updateCountPostfix = () => {
    const id = count.current++;
    return id;
  };
  const updateCountPrefix = () => {
    const id = ++count.current;
    return id;
  };
  useEffect(() => {
    const id = updateCountPostfix();
    console.log(`id = ${id}`);
    console.log(`count = ${count.current}`);
  }, []);
  return {count, updateCountPostfix, updateCountPrefix};
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};
