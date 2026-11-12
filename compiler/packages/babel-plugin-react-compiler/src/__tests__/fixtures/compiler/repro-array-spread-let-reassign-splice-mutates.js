/**
 * Regression for https://github.com/facebook/react/issues/38140
 *
 * In-place `splice` mutation in a later element must not affect an earlier
 * spread of the same reassigned `let` array.
 */
function Component() {
  let a;
  a = [1, 2, 3];
  const e = [...a, (a.splice(0, 1), a.length)];
  return e.join(',');
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
