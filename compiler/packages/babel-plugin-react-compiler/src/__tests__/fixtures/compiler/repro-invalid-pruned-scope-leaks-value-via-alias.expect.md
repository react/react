
## Input

```javascript
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
  const z2 = z;
  const thing = [y, z2];
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

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import invariant from "invariant";
import {
  makeObject_Primitives,
  mutate,
  sum,
  useIdentity,
} from "shared-runtime";

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
function MyApp(t0) {
  const $ = _c(6);
  const { count } = t0;
  const z = makeObject_Primitives();
  const x = useIdentity(2);
  let t1;
  if ($[0] !== count || $[1] !== x) {
    t1 = sum(x, count);
    $[0] = count;
    $[1] = x;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const y = t1;
  mutate(z);
  const z2 = z;
  let t2;
  if ($[3] !== y || $[4] !== z2) {
    t2 = [y, z2];
    $[3] = y;
    $[4] = z2;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  const thing = t2;
  if (thing[1] !== z) {
    invariant(false, "oh no!");
  }

  return thing;
}

export const FIXTURE_ENTRYPOINT = {
  fn: MyApp,
  params: [{ count: 2 }],
  sequentialRenders: [{ count: 2 }, { count: 2 }, { count: 3 }],
};

```
      
### Eval output
(kind: ok) [4,{"a":0,"b":"value1","c":true,"wat0":"joe"}]
[4,{"a":0,"b":"value1","c":true,"wat0":"joe"}]
[5,{"a":0,"b":"value1","c":true,"wat0":"joe"}]