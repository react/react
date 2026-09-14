
## Input

```javascript
function foo(x) {
  const y = {0x10: x};
  const {16: z} = y;
  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [10],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function foo(x) {
  const $ = _c(2);
  let t0;
  if ($[0] !== x) {
    t0 = { 16: x };
    $[0] = x;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const y = t0;
  const { 16: z } = y;
  return z;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [10],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) 10