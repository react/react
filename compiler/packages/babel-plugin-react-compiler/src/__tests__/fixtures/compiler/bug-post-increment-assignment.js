// @enableNewMutationAliasingModel:false
/**
 * Bug repro:
 * Found differences in evaluator results
 *   Non-forget (expected):
 *   (kind: ok) {"count":3,"res":[0,1,2]}
 *   Forget:
 *   (kind: ok) {"count":3,"res":[1,2,3]}
 *
 * The post-increment operator `agg.count++` should return the value 
 * BEFORE incrementing, but the compiler's optimization incorrectly
 * causes the incremented value to be used.
 */
function Component(props) {
  const items = [0, 1, 2];
  return items.reduce((agg, item) => {
    const current = agg.count++;
    agg.res.push(current);
    return agg;
  }, {count: 0, res: []});
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
