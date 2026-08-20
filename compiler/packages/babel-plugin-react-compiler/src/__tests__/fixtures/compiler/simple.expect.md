
## Input

```javascript
export default function foo(x, y) {
  if (x) {
    return foo(false, y);
  }
  return [y * 10];
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
export default function foo(x, y) {
  const $ = _c(4);
  if (x) {
    let t0;
    if ($[0] !== y) {
      t0 = foo(false, y);
      $[0] = y;
      $[1] = t0;
    } else {
      t0 = $[1];
    }
    return t0;
  }

  const t0 = y * 10;
  let t1;
  if ($[2] !== t0) {
    t1 = [t0];
    $[2] = t0;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}

```
      