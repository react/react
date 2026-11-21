
## Input

```javascript
/**
 * Regression for https://github.com/facebook/react/issues/38140
 *
 * Same deferred-spread case with the spread in the middle of the array literal
 * and a mutating later element.
 */
function Component() {
  let a;
  a = [1, 2, 3];
  const e = [0, ...a, (a.push(5), 9)];
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
 * Same deferred-spread case with the spread in the middle of the array literal
 * and a mutating later element.
 */
function Component() {
  const $ = _c(5);
  let a;
  let t0;
  let t1;
  let t2;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    a = [1, 2, 3];
    t0 = 0;
    t1 = [...a];
    t2 = (a.push(5), 9);
    $[0] = t0;
    $[1] = t1;
    $[2] = t2;
    $[3] = a;
  } else {
    t0 = $[0];
    t1 = $[1];
    t2 = $[2];
    a = $[3];
  }
  let t3;
  if ($[4] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = [t0, ...t1, t2];
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  const e = t3;
  return e.join(",");
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) "0,1,2,3,9"