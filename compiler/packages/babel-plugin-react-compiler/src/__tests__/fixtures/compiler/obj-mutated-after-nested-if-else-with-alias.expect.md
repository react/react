
## Input

```javascript
function foo(a, b, c, d) {
  let x = someObj();
  if (a) {
    let z;
    if (b) {
      const w = someObj();
      z = w;
    } else {
      z = someObj();
    }
    const y = z;
    x = z;
  } else {
    x = someObj();
  }

  x.f = 1;
  return x;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function foo(a, b, c, d) {
  const $ = _c(3);
  someObj();
  let x;
  if ($[0] !== a || $[1] !== b) {
    if (a) {
      let z;
      if (b) {
        const w = someObj();
        z = w;
      } else {
        z = someObj();
      }

      x = z;
    } else {
      x = someObj();
    }

    x.f = 1;
    $[0] = a;
    $[1] = b;
    $[2] = x;
  } else {
    x = $[2];
  }
  return x;
}

```
      