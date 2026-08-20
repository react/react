
## Input

```javascript
function g() {
  const x = {y: {z: 1}};
  x.y.z = x.y.z + 1;
  x.y.z *= 2;
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: g,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function g() {
  const $ = _c(1);
  let x;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    x = { y: { z: 1 } };
    x.y.z = x.y.z + 1;
    x.y.z = x.y.z * 2;
    $[0] = x;
  } else {
    x = $[0];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: g,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) {"y":{"z":4}}