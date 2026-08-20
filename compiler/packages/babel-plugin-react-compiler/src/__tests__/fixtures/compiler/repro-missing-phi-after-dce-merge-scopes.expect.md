
## Input

```javascript
function Component() {
  let v3, v4, acc;
  v3 = false;
  v4 = v3;
  acc = v3;
  if (acc) {
    acc = true;
    v3 = acc;
  }
  if (acc) {
    v3 = v4;
  }
  v4 = v3;
  return [acc, v3, v4];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [false, false, false];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```
      
### Eval output
(kind: ok) [false,false,false]