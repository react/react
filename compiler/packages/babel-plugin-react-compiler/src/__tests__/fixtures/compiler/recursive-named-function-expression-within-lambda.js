// @compilationMode:"all"

/**
 * Regression test for a compiler crash on a named function expression that
 * references its own name recursively from within a lambda:
 *
 *   Invariant: [InferMutationAliasingEffects] Expected value kind to be initialized
 *
 * The self-reference (`recur` below) is bound in the function's own scope, so
 * it is neither a parameter nor a captured context variable and was never
 * seeded in the mutation/aliasing inference state.
 */
function Component(props) {
  const run = () => {
    const apply = fn => fn(props.count);
    return apply(function recur(n) {
      if (n <= 0) {
        return 0;
      }
      return n + recur(n - 1);
    });
  };
  return run();
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{count: 4}],
};
