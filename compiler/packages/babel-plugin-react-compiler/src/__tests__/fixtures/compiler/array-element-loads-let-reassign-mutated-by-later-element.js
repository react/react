/**
 * Control for https://github.com/facebook/react/issues/38140
 *
 * Indexed element loads eagerly materialize values, so a later in-place
 * mutation does not change earlier elements even with `let` reassignment.
 */
function Component() {
  let a;
  a = [1, 2, 3];
  const e = [a[0], a[1], a[2], (a.push(5), a.length)];
  return e.join(',');
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
