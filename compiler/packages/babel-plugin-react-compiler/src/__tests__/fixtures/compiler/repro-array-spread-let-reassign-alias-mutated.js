/**
 * Regression for https://github.com/facebook/react/issues/38140
 *
 * Spreading an alias of the reassigned `let` array must still snapshot before a
 * later element mutates the underlying array through the original binding.
 */
function Component() {
  let a;
  a = [1, 2, 3];
  const b = a;
  const e = [...b, (a.push(5), a.length)];
  return e.join(',');
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
