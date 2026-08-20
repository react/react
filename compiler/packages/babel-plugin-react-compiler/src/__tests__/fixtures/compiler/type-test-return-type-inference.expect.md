
## Input

```javascript
function component() {
  let x = foo();
  let y = foo();
  if (x > y) {
    let z = {};
  }

  let z = foo();
  return z;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function component() {
  const $ = _c(1);
  const x = foo();
  const y = foo();
  if (x > y) {
  }
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = foo();
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const z_0 = t0;
  return z_0;
}

```
      