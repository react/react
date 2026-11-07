/**
 * Regression for https://github.com/facebook/react/issues/38140
 *
 * First spread must capture pre-mutation contents; a later spread after the
 * mutation may observe the updated array.
 */
function Component() {
  let a;
  a = [1, 2];
  const e = [...a, (a.push(9), 0), ...a];
  return e.join(',');
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
