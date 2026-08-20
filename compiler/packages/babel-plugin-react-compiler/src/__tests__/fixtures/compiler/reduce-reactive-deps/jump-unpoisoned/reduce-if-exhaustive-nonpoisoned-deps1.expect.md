
## Input

```javascript
import {identity} from 'shared-runtime';

function useFoo({input, cond2, cond1}) {
  const x = [];
  if (cond1) {
    if (!cond2) {
      x.push(identity(input.a.b));
      return null;
    } else {
      x.push(identity(input.a.b));
    }
  } else {
    x.push(identity(input.a.b));
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{input: {b: 1}, cond1: true, cond2: false}],
  sequentialRenders: [
    {input: {a: {b: 1}}, cond1: true, cond2: true},
    {input: null, cond1: true, cond2: false},
    // preserve nullthrows
    {input: {a: {b: undefined}}, cond1: true, cond2: true},
    {input: {a: null}, cond1: true, cond2: true},
    {input: {a: {b: undefined}}, cond1: true, cond2: true},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity } from "shared-runtime";

function useFoo(t0) {
  const $ = _c(11);
  const { input, cond2, cond1 } = t0;
  let t1;
  let x;
  if ($[0] !== cond1 || $[1] !== cond2 || $[2] !== input.a.b) {
    t1 = Symbol.for("react.early_return_sentinel");
    bb0: {
      x = [];
      if (cond1) {
        if (!cond2) {
          let t2;
          if ($[5] !== input.a.b) {
            t2 = identity(input.a.b);
            $[5] = input.a.b;
            $[6] = t2;
          } else {
            t2 = $[6];
          }
          x.push(t2);
          t1 = null;
          break bb0;
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
      } else {
        let t2;
        if ($[9] !== input.a.b) {
          t2 = identity(input.a.b);
          $[9] = input.a.b;
          $[10] = t2;
        } else {
          t2 = $[10];
        }
        x.push(t2);
      }
    }
    $[0] = cond1;
    $[1] = cond2;
    $[2] = input.a.b;
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
  params: [{ input: { b: 1 }, cond1: true, cond2: false }],
  sequentialRenders: [
    { input: { a: { b: 1 } }, cond1: true, cond2: true },
    { input: null, cond1: true, cond2: false },
    // preserve nullthrows
    { input: { a: { b: undefined } }, cond1: true, cond2: true },
    { input: { a: null }, cond1: true, cond2: true },
    { input: { a: { b: undefined } }, cond1: true, cond2: true },
  ],
};

```
      
### Eval output
(kind: ok) [1]
[[ (exception in render) TypeError: Cannot read properties of null (reading 'a') ]]
[null]
[[ (exception in render) TypeError: Cannot read properties of null (reading 'b') ]]
[null]