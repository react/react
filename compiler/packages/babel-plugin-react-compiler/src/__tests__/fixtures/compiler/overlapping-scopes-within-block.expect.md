
## Input

```javascript
function foo(a, b, c) {
  let x = [];
  if (a) {
    let y = [];
    if (b) {
      y.push(c);
    }

    x.push(y);
  }
  return x;
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
function foo(a, b, c) {
  const $ = _c(7);
  let x;
  if ($[0] !== a || $[1] !== b || $[2] !== c) {
    x = [];
    if (a) {
      let y;
      if ($[4] !== b || $[5] !== c) {
        y = [];
        if (b) {
          y.push(c);
        }
        $[4] = b;
        $[5] = c;
        $[6] = y;
      } else {
        y = $[6];
      }

      x.push(y);
    }
    $[0] = a;
    $[1] = b;
    $[2] = c;
    $[3] = x;
  } else {
    x = $[3];
  }

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: ["TodoAdd"],
  isComponent: "TodoAdd",
};

```
      