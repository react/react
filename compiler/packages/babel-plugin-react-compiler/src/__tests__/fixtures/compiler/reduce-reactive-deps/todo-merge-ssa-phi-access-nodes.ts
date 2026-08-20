import {
  identity,
  makeObject_Primitives,
  setPropertyByKey,
} from 'shared-runtime';

/**
 * A bit of an edge case, but we could further optimize here by merging
 * re-orderability of nodes across phis.
 */
function useFoo(cond) {
  let x;
  if (cond) {
    /** start of scope for x_@0 */
    x = {};
    setPropertyByKey(x, 'a', {b: 2});
    /** end of scope for x_@0 */
    Math.max(x.a.b, 0);
  } else {
    /** start of scope for x_@1 */
    x = makeObject_Primitives();
    setPropertyByKey(x, 'a', {b: 3});
    /** end of scope for x_@1 */
    Math.max(x.a.b, 0);
  }
  /**
   * At this point, we have a phi node.
   * x_@2 = phi(x_@0, x_@1)
   *
   * We can assume that both x_@0 and x_@1 both have non-null `x.a` properties,
   * so we can infer that x_@2 does as well.
   */

  // Here, y should take a dependency on `x.a.b`
  const y = [];
  if (identity(cond)) {
    y.push(x.a.b);
  }
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [true],
};
