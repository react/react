
## Input

```javascript
import {identity} from 'shared-runtime';

function useFoo({input, cond, hasAB}) {
  const x = [];
  if (cond) {
    if (!hasAB) {
      return null;
    }
    x.push(identity(input.a.b));
  } else {
    x.push(identity(input.a.b));
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{input: {b: 1}, cond: true, hasAB: false}],
  sequentialRenders: [
    {input: {a: {b: 1}}, cond: true, hasAB: true},
    {input: null, cond: true, hasAB: false},
    // preserve nullthrows
    {input: {a: {b: undefined}}, cond: true, hasAB: true},
    {input: {a: undefined}, cond: true, hasAB: true},
    {input: {a: {b: undefined}}, cond: true, hasAB: true},
    {input: undefined, cond: true, hasAB: true},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity } from "shared-runtime";

function useFoo(t0) {
  const $ = _c(9);
  const { input, cond, hasAB } = t0;
  let t1;
  let x;
  if ($[0] !== cond || $[1] !== hasAB || $[2] !== input) {
    t1 = Symbol.for("react.early_return_sentinel");
    bb0: {
      x = [];
      if (cond) {
        if (!hasAB) {
          t1 = null;
          break bb0;
        }
        let t2;
        if ($[5] !== input.a.b) {
          t2 = identity(input.a.b);
          $[5] = input.a.b;
          $[6] = t2;
        } else {
          t2 = $[6];
        }
        x.push(t2);
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
    $[0] = cond;
    $[1] = hasAB;
    $[2] = input;
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
  params: [{ input: { b: 1 }, cond: true, hasAB: false }],
  sequentialRenders: [
    { input: { a: { b: 1 } }, cond: true, hasAB: true },
    { input: null, cond: true, hasAB: false },
    // preserve nullthrows
    { input: { a: { b: undefined } }, cond: true, hasAB: true },
    { input: { a: undefined }, cond: true, hasAB: true },
    { input: { a: { b: undefined } }, cond: true, hasAB: true },
    { input: undefined, cond: true, hasAB: true },
  ],
};

```
      
### Eval output
(kind: ok) [1]
null
[null]
[[ (exception in render) TypeError: Cannot read properties of undefined (reading 'b') ]]
[null]
[[ (exception in render) TypeError: Cannot read properties of undefined (reading 'a') ]]