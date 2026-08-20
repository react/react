
## Input

```javascript
// @debug
function Component(a, b) {
  let x = [];
  let y = [];
  let z = foo(a);
  if (FLAG) {
    x = bar(z);
    y = baz(b);
  }
  return [x, y];
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @debug
function Component(a, b) {
  const $ = _c(11);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  let x = t0;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = [];
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  let y = t1;
  if ($[2] !== a || $[3] !== b) {
    const z = foo(a);
    if (FLAG) {
      x = bar(z);
      let t2;
      if ($[6] !== b) {
        t2 = baz(b);
        $[6] = b;
        $[7] = t2;
      } else {
        t2 = $[7];
      }
      y = t2;
    }
    $[2] = a;
    $[3] = b;
    $[4] = x;
    $[5] = y;
  } else {
    x = $[4];
    y = $[5];
  }
  let t2;
  if ($[8] !== x || $[9] !== y) {
    t2 = [x, y];
    $[8] = x;
    $[9] = y;
    $[10] = t2;
  } else {
    t2 = $[10];
  }
  return t2;
}

```
      