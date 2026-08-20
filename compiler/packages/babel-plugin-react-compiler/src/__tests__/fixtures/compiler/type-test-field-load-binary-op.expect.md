
## Input

```javascript
function component() {
  let x = {u: makeSomePrimitive(), v: makeSomePrimitive()};
  let u = x.u;
  let v = x.v;
  if (u > v) {
  }

  let y = x.u;
  let z = x.v;
  return z;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = { u: makeSomePrimitive(), v: makeSomePrimitive() };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const x = t0;
  const u = x.u;
  const v = x.v;
  if (u > v) {
  }

  const z = x.v;
  return z;
}

```
      