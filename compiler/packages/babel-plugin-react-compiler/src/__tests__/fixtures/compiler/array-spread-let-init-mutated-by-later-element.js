/**
 * Control for https://github.com/facebook/react/issues/38140
 *
 * `let` with initializer (no separate reassignment): evaluation order is
 * preserved when a later element mutates the spread target (codegen may fold
 * the snapshot).
 */
function Component() {
  let a = [1, 2, 3];
  const e = [...a, (a.push(5), a.length)];
  return e.join(',');
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
