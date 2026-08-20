
## Input

```javascript
function Component(a) {
  let d = a++;
  let e = ++a;
  return [a, d, e];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [2],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(a) {
  const $ = _c(4);
  const d = a++;
  const e = ++a;
  let t0;
  if ($[0] !== a || $[1] !== d || $[2] !== e) {
    t0 = [a, d, e];
    $[0] = a;
    $[1] = d;
    $[2] = e;
    $[3] = t0;
  } else {
    t0 = $[3];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [2],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) [4,2,4]