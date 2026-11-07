/**
 * Regression for https://github.com/facebook/react/issues/38140
 *
 * Mutation via indexed store (not `push`) between spread evaluation and
 * array construction must not be visible to the spread.
 */
function Component() {
  let a;
  a = [1, 2, 3];
  const e = [...a, ((a[3] = 5), a.length)];
  return e.join(',');
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
