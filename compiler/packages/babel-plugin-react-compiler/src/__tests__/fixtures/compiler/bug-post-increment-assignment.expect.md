
## Input

```javascript
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

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableNewMutationAliasingModel:false
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
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const items = [0, 1, 2];
    t0 = items.reduce(
      _temp,

      { count: 0, res: [] },
    );
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
function _temp(agg, item) {
  agg.count = agg.count + 1;
  const current = agg.count;
  agg.res.push(current);
  return agg;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```
      