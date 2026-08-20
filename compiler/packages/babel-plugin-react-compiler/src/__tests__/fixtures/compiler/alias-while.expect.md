
## Input

```javascript
function foo(cond) {
  let a = {};
  let b = {};
  let c = {};
  while (cond) {
    let z = a;
    a = b;
    b = c;
    c = z;
    mutate(a, b);
  }
  a;
  b;
  c;
  return a;
}

function mutate(x, y) {}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function foo(cond) {
  const $ = _c(2);
  let a;
  if ($[0] !== cond) {
    a = {};
    let b = {};
    let c = {};
    while (cond) {
      const z = a;
      a = b;
      b = c;
      c = z;
      mutate(a, b);
    }
    $[0] = cond;
    $[1] = a;
  } else {
    a = $[1];
  }

  return a;
}

function mutate(x, y) {}

```
      