
## Input

```javascript
/**
 * Regression for https://github.com/facebook/react/issues/38140
 *
 * First spread must capture pre-mutation contents; a later spread after the
 * mutation may observe the updated array.
 */
function Component() {
  let a;
  a = [1, 2];
  const e = [...a, (a.push(9), 0), ...a];
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
 * First spread must capture pre-mutation contents; a later spread after the
 * mutation may observe the updated array.
 */
function Component() {
  const $ = _c(4);
  let a;
  let t0;
  let t1;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    a = [1, 2];
    t0 = [...a];
    t1 = (a.push(9), 0);
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
    t2 = [...t0, t1, ...a];
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
(kind: ok) "1,2,0,1,2,9"