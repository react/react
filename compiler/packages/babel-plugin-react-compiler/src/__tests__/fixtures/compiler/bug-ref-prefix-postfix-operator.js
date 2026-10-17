import {useRef, useEffect} from 'react';

/**
 * The postfix increment operator returns the value before incrementing.
 * ```js
 * const id = count.current; // 0
 * count.current = count.current + 1; // 1
 * return id;
 * ```
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
