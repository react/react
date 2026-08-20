
## Input

```javascript
import {identity} from 'shared-runtime';

function useFoo({input, hasAB, returnNull}) {
  const x = [];
  if (!hasAB) {
    x.push(identity(input.a));
    if (!returnNull) {
      return null;
    }
  } else {
    x.push(identity(input.a.b));
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{input: {b: 1}, hasAB: false, returnNull: false}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity } from "shared-runtime";

function useFoo(t0) {
  const $ = _c(9);
  const { input, hasAB, returnNull } = t0;
  let t1;
  let x;
  if ($[0] !== hasAB || $[1] !== input.a || $[2] !== returnNull) {
    t1 = Symbol.for("react.early_return_sentinel");
    bb0: {
      x = [];
      if (!hasAB) {
        let t2;
        if ($[5] !== input.a) {
          t2 = identity(input.a);
          $[5] = input.a;
          $[6] = t2;
        } else {
          t2 = $[6];
        }
        x.push(t2);
        if (!returnNull) {
          t1 = null;
          break bb0;
        }
      } else {
        let t2;
        if ($[7] !== input.a.b) {
          t2 = identity(input.a.b);
          $[7] = input.a.b;
          $[8] = t2;
        } else {
          t2 = $[8];
        }
        x.push(t2);
      }
    }
    $[0] = hasAB;
    $[1] = input.a;
    $[2] = returnNull;
    $[3] = t1;
    $[4] = x;
  } else {
    t1 = $[3];
    x = $[4];
  }
  if (t1 !== Symbol.for("react.early_return_sentinel")) {
    return t1;
  }

  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ input: { b: 1 }, hasAB: false, returnNull: false }],
};

```
      
### Eval output
(kind: ok) null