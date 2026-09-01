
## Input

```javascript
import {identity} from 'shared-runtime';

function useFoo({input, inputHasAB, inputHasABC}) {
  const x = [];
  if (!inputHasABC) {
    x.push(identity(input.a));
    if (!inputHasAB) {
      return null;
    }
    x.push(identity(input.a.b));
  } else {
    x.push(identity(input.a.b.c));
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{input: {b: 1}, inputHasAB: false, inputHasABC: false}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity } from "shared-runtime";

function useFoo(t0) {
  const $ = _c(11);
  const { input, inputHasAB, inputHasABC } = t0;
  let t1;
  let x;
  if ($[0] !== input.a || $[1] !== inputHasAB || $[2] !== inputHasABC) {
    t1 = Symbol.for("react.early_return_sentinel");
    bb0: {
      x = [];
      if (!inputHasABC) {
        let t2;
        if ($[5] !== input.a) {
          t2 = identity(input.a);
          $[5] = input.a;
          $[6] = t2;
        } else {
          t2 = $[6];
        }
        x.push(t2);
        if (!inputHasAB) {
          t1 = null;
          break bb0;
        }
        let t3;
        if ($[7] !== input.a.b) {
          t3 = identity(input.a.b);
          $[7] = input.a.b;
          $[8] = t3;
        } else {
          t3 = $[8];
        }
        x.push(t3);
      } else {
        let t2;
        if ($[9] !== input.a.b.c) {
          t2 = identity(input.a.b.c);
          $[9] = input.a.b.c;
          $[10] = t2;
        } else {
          t2 = $[10];
        }
        x.push(t2);
      }
    }
    $[0] = input.a;
    $[1] = inputHasAB;
    $[2] = inputHasABC;
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
  params: [{ input: { b: 1 }, inputHasAB: false, inputHasABC: false }],
};

```
      
### Eval output
(kind: ok) null