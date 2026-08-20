
## Input

```javascript
function foo(a, b, c, d) {
  let y = [];
  label: if (a) {
    if (b) {
      y.push(c);
      break label;
    }
    y.push(d);
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
function foo(a, b, c, d) {
  const $ = _c(5);
  let y;
  if ($[0] !== a || $[1] !== b || $[2] !== c || $[3] !== d) {
    y = [];
    bb0: if (a) {
      if (b) {
        y.push(c);
        break bb0;
      }

      y.push(d);
    }
    $[0] = a;
    $[1] = b;
    $[2] = c;
    $[3] = d;
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
      