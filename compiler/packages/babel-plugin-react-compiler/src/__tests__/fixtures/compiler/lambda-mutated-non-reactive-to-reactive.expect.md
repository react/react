
## Input

```javascript
function f(a) {
  let x;
  (() => {
    x = {a};
  })();
  return <div x={x} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: f,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function f(a) {
  const $ = _c(4);
  let x;
  if ($[0] !== a) {
    x = { a };
    $[0] = a;
    $[1] = x;
  } else {
    x = $[1];
  }
  let t0;
  if ($[2] !== x) {
    t0 = <div x={x} />;
    $[2] = x;
    $[3] = t0;
  } else {
    t0 = $[3];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: f,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      