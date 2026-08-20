
## Input

```javascript
import {identity} from 'shared-runtime';

function useFoo({input, cond}) {
  const x = [];
  if (cond) {
    return null;
  }
  x.push(identity(input.a.b));
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{input: {a: {b: 2}}, cond: false}],
  sequentialRenders: [
    {input: {a: {b: 2}}, cond: false},
    // preserve nullthrows
    {input: null, cond: false},
    {input: null, cond: true},
    {input: {}, cond: false},
    {input: {a: {b: null}}, cond: false},
    {input: {a: null}, cond: false},
    {input: {a: {b: 3}}, cond: false},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { identity } from "shared-runtime";

function useFoo(t0) {
  const $ = _c(6);
  const { input, cond } = t0;
  let t1;
  let x;
  if ($[0] !== cond || $[1] !== input) {
    t1 = Symbol.for("react.early_return_sentinel");
    bb0: {
      x = [];
      if (cond) {
        t1 = null;
        break bb0;
      }
      let t2;
      if ($[4] !== input.a.b) {
        t2 = identity(input.a.b);
        $[4] = input.a.b;
        $[5] = t2;
      } else {
        t2 = $[5];
      }
      x.push(t2);
    }
    $[0] = cond;
    $[1] = input;
    $[2] = t1;
    $[3] = x;
  } else {
    t1 = $[2];
    x = $[3];
  }
  if (t1 !== Symbol.for("react.early_return_sentinel")) {
    return t1;
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ input: { a: { b: 2 } }, cond: false }],
  sequentialRenders: [
    { input: { a: { b: 2 } }, cond: false },
    // preserve nullthrows
    { input: null, cond: false },
    { input: null, cond: true },
    { input: {}, cond: false },
    { input: { a: { b: null } }, cond: false },
    { input: { a: null }, cond: false },
    { input: { a: { b: 3 } }, cond: false },
  ],
};

```
      
### Eval output
(kind: ok) [2]
[[ (exception in render) TypeError: Cannot read properties of null (reading 'a') ]]
null
[[ (exception in render) TypeError: Cannot read properties of undefined (reading 'b') ]]
[null]
[[ (exception in render) TypeError: Cannot read properties of null (reading 'b') ]]
[3]