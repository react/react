/**
 * Regression for https://github.com/facebook/react/issues/38140
 *
 * A later element that is a TSInstantiationExpression wrapping a mutation
 * must still be treated as effectful so the spread iterates pre-mutation.
 */
function Component() {
  let a: Array<number>;
  a = [1, 2, 3];
  const e = [...a, (a.push(5), a.length)<any>];
  return e.join(',');
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
