
## Input

```javascript
/**
 * Control for https://github.com/facebook/react/issues/38140
 *
 * Indexed element loads eagerly materialize values, so a later in-place
 * mutation does not change earlier elements even with `let` reassignment.
 */
function Component() {
  let a;
  a = [1, 2, 3];
  const e = [a[0], a[1], a[2], (a.push(5), a.length)];
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
 * Control for https://github.com/facebook/react/issues/38140
 *
 * Indexed element loads eagerly materialize values, so a later in-place
 * mutation does not change earlier elements even with `let` reassignment.
 */
function Component() {
  const $ = _c(6);
  let a;
  let t0;
  let t1;
  let t2;
  let t3;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    a = [1, 2, 3];
    t0 = a[0];
    t1 = a[1];
    t2 = a[2];
    t3 = (a.push(5), a.length);
    $[0] = t0;
    $[1] = t1;
    $[2] = t2;
    $[3] = t3;
    $[4] = a;
  } else {
    t0 = $[0];
    t1 = $[1];
    t2 = $[2];
    t3 = $[3];
    a = $[4];
  }
  let t4;
  if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
    t4 = [t0, t1, t2, t3];
    $[5] = t4;
  } else {
    t4 = $[5];
  }
  const e = t4;
  return e.join(",");
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) "1,2,3,4"