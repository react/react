
## Input

```javascript
function foo(a) {
  const x = {};
  if (a) {
    let y = {};
    x.y = y;
  } else {
    let z = {};
    x.z = z;
  }
  mutate(x);
  return x;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function foo(a) {
  const $ = _c(2);
  let x;
  if ($[0] !== a) {
    x = {};
    if (a) {
      const y = {};
      x.y = y;
    } else {
      const z = {};
      x.z = z;
    }

    mutate(x);
    $[0] = a;
    $[1] = x;
  } else {
    x = $[1];
  }
  return x;
}

```
      