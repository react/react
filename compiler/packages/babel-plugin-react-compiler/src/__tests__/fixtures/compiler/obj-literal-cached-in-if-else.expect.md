
## Input

```javascript
function foo(a, b, c, d) {
  let x = {};
  if (someVal) {
    x = {b};
  } else {
    x = {c};
  }

  return x;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function foo(a, b, c, d) {
  const $ = _c(4);
  let x;
  if (someVal) {
    let t0;
    if ($[0] !== b) {
      t0 = { b };
      $[0] = b;
      $[1] = t0;
    } else {
      t0 = $[1];
    }
    x = t0;
  } else {
    let t0;
    if ($[2] !== c) {
      t0 = { c };
      $[2] = c;
      $[3] = t0;
    } else {
      t0 = $[3];
    }
    x = t0;
  }

  return x;
}

```
      