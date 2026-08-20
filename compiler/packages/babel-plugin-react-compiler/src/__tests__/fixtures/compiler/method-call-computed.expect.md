
## Input

```javascript
function foo(a, b, c) {
  // Construct and freeze x, y
  const x = makeObject(a);
  const y = makeObject(a);
  <div>
    {x}
    {y}
  </div>;

  // z should depend on `x`, `y.method`, and `b`
  const z = x[y.method](b);
  return z;
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function foo(a, b, c) {
  const $ = _c(8);
  let t0;
  if ($[0] !== a) {
    t0 = makeObject(a);
    $[0] = a;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const x = t0;
  let t1;
  if ($[2] !== a) {
    t1 = makeObject(a);
    $[2] = a;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  const y = t1;
  let t2;
  if ($[4] !== b || $[5] !== x || $[6] !== y.method) {
    t2 = x[y.method](b);
    $[4] = b;
    $[5] = x;
    $[6] = y.method;
    $[7] = t2;
  } else {
    t2 = $[7];
  }
  const z = t2;
  return z;
}

```
      