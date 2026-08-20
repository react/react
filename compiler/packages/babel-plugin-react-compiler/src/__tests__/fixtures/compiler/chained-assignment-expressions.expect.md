
## Input

```javascript
function foo() {
  const x = {x: 0};
  const y = {z: 0};
  const z = {z: 0};
  x.x += y.y *= 1;
  z.z += y.y *= x.x &= 3;
  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function foo() {
  const $ = _c(1);
  let z;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    const x = { x: 0 };
    const y = { z: 0 };
    z = { z: 0 };
    x.x = x.x + (y.y = y.y * 1);
    z.z = z.z + (y.y = y.y * (x.x = x.x & 3));
    $[0] = z;
  } else {
    z = $[0];
  }
  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) {"z":null}