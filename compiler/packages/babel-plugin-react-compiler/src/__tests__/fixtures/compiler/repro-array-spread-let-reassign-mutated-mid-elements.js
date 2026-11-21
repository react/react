/**
 * Regression for https://github.com/facebook/react/issues/38140
 *
 * Same deferred-spread case with the spread in the middle of the array literal
 * and a mutating later element.
 */
function Component() {
  let a;
  a = [1, 2, 3];
  const e = [0, ...a, (a.push(5), 9)];
  return e.join(',');
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
