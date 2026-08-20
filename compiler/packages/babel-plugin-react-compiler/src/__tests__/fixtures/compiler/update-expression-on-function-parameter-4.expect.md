
## Input

```javascript
function Component([b]) {
  let f = b--;
  let g = --b;
  return [b, f, g];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [[3]],
  isComponent: false,
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0) {
  const $ = _c(4);
  let [b] = t0;
  const f = b--;
  const g = --b;
  let t1;
  if ($[0] !== b || $[1] !== f || $[2] !== g) {
    t1 = [b, f, g];
    $[0] = b;
    $[1] = f;
    $[2] = g;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [[3]],
  isComponent: false,
};

```
      
### Eval output
(kind: ok) [1,3,1]