import invariant from 'invariant';
import {makeObject_Primitives, mutate, sum, useIdentity} from 'shared-runtime';

/**
 * Here, `z`'s original memo block is removed due to the inner hook call.
 * However, we also infer that `z` is non-reactive, so by default we would create
 * the memo block for `thing = [y, z]` as only depending on `y`.
 *
 * This could then mean that `thing[1]` and `z` may not refer to the same value,
 * since z recreates every time but `thing` doesn't correspondingly invalidate.
 *
 * The fix is to consider pruned memo block outputs as reactive, since they will
 * recreate on every render. This means `thing` depends on both y and z.
 */
function MyApp({count}) {
  const z = makeObject_Primitives();
  const x = useIdentity(2);
  const y = sum(x, count);
  mutate(z);
  const thing = [y, z];
  if (thing[1] !== z) {
    invariant(false, 'oh no!');
  }
  return thing;
}

export const FIXTURE_ENTRYPOINT = {
  fn: MyApp,
  params: [{count: 2}],
  sequentialRenders: [{count: 2}, {count: 2}, {count: 3}],
};
