
## Input

```javascript
function Component(x = 'default', y = [{}]) {
  return [x, y];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function Component(t0, t1) {
  const $ = _c(5);
  const x = t0 === undefined ? "default" : t0;
  let t2;
  if ($[0] !== t1) {
    t2 = t1 === undefined ? [{}] : t1;
    $[0] = t1;
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  const y = t2;
  let t3;
  if ($[2] !== x || $[3] !== y) {
    t3 = [x, y];
    $[2] = x;
    $[3] = y;
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      