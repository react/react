/**
 * Regression for https://github.com/facebook/react/issues/38140
 *
 * `delete` on the spread target in a later element must not run before the
 * spread iterates — including when `let` reassignment splits reactive scopes.
 */
function Component() {
  let a;
  a = [1, 2, 3];
  const e = [...a, (delete a[0], 0)];
  return e.join(',');
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
