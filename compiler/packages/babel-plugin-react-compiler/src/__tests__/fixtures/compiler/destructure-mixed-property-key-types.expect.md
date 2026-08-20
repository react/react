
## Input

```javascript
function foo() {
  const {'data-foo-bar': x, a: y, data: z} = {'data-foo-bar': 1, a: 2, data: 3};
  return [x, y, z];
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
  const $ = _c(2);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = { "data-foo-bar": 1, a: 2, data: 3 };
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const { "data-foo-bar": x, a: y, data: z } = t0;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = [x, y, z];
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) [1,2,3]