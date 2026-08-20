
## Input

```javascript
function component({a, b}) {
  let y = {a};
  let z = {b};
  return {y, z};
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function component(t0) {
  const $ = _c(7);
  const { a, b } = t0;
  let t1;
  if ($[0] !== a) {
    t1 = { a };
    $[0] = a;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const y = t1;
  let t2;
  if ($[2] !== b) {
    t2 = { b };
    $[2] = b;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  const z = t2;
  let t3;
  if ($[4] !== y || $[5] !== z) {
    t3 = { y, z };
    $[4] = y;
    $[5] = z;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: component,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      