
## Input

```javascript
function Component() {
  let a = 0;
  const b = a++;
  const c = ++a;
  const d = a--;
  const e = --a;
  return {a, b, c, d, e};
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = { a: 0, b: 0, c: 2, d: 2, e: 0 };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) {"a":0,"b":0,"c":2,"d":2,"e":0}