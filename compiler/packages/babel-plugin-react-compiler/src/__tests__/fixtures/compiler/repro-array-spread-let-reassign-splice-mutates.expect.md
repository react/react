
## Input

```javascript
/**
 * Regression for https://github.com/facebook/react/issues/38140
 *
 * In-place `splice` mutation in a later element must not affect an earlier
 * spread of the same reassigned `let` array.
 */
function Component() {
  let a;
  a = [1, 2, 3];
  const e = [...a, (a.splice(0, 1), a.length)];
  return e.join(',');
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; /**
 * Regression for https://github.com/facebook/react/issues/38140
 *
 * In-place `splice` mutation in a later element must not affect an earlier
 * spread of the same reassigned `let` array.
 */
function Component() {
  const $ = _c(4);
  let a;
  let t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    a = [1, 2, 3];
    t0 = [...a];
    t1 = (a.splice(0, 1), a.length);
    $[0] = t0;
    $[1] = t1;
    $[2] = a;
  } else {
    t0 = $[0];
    t1 = $[1];
    a = $[2];
  }
  let t2;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t2 = [...t0, t1];
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  const e = t2;
  return e.join(",");
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) "1,2,3,2"