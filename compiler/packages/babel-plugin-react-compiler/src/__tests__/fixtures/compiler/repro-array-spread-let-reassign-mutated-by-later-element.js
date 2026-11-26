/**
 * Regression for https://github.com/facebook/react/issues/38140
 *
 * Spreading a `let` binding that was reassigned, then mutating that array in a
 * later array element, must still iterate the pre-mutation contents.
 */
function Component() {
  let a;
  a = [1, 2, 3];
  const e = [...a, (a.push(5), a.length)];
  return e.join(',');
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
