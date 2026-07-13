
## Input

```javascript
function foo(a, b) {
  const x = [];
  x.push(a);
  <div>{x}</div>;

  const y = [];
  if (x.length) {
    y.push(x);
  }
  if (b) {
    y.push(b);
  }
  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function foo(a, b) {
  const $ = _c(5);
  let x;
  if ($[0] !== a) {
    x = [];
    x.push(a);
    $[0] = a;
    $[1] = x;
  } else {
    x = $[1];
  }
  let y;
  if ($[2] !== b || $[3] !== x) {
    y = [];
    if (x.length) {
      y.push(x);
    }

    if (b) {
      y.push(b);
    }
    $[2] = b;
    $[3] = x;
    $[4] = y;
  } else {
    y = $[4];
  }

  return y;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      