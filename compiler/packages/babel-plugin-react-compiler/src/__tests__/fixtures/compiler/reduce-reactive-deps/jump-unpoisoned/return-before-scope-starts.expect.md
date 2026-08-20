
## Input

```javascript
import {arrayPush} from 'shared-runtime';

function useFoo({input, cond}) {
  if (cond) {
    return {result: 'early return'};
  }

  // unconditional
  const x = [];
  arrayPush(x, input.a.b);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{input: {a: {b: 2}}, cond: false}],
  sequentialRenders: [
    {input: null, cond: true},
    {input: {a: {b: 2}}, cond: false},
    {input: null, cond: true},
    // preserve nullthrows
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
import { arrayPush } from "shared-runtime";

function useFoo(t0) {
  const $ = _c(3);
  const { input, cond } = t0;
  if (cond) {
    let t1;
    if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
      t1 = { result: "early return" };
      $[0] = t1;
    } else {
      t1 = $[0];
    }
    return t1;
  }
  let x;
  if ($[1] !== input.a.b) {
    x = [];
    arrayPush(x, input.a.b);
    $[1] = input.a.b;
    $[2] = x;
  } else {
    x = $[2];
  }
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ input: { a: { b: 2 } }, cond: false }],
  sequentialRenders: [
    { input: null, cond: true },
    { input: { a: { b: 2 } }, cond: false },
    { input: null, cond: true },
    // preserve nullthrows
    { input: {}, cond: false },
    { input: { a: { b: null } }, cond: false },
    { input: { a: null }, cond: false },
    { input: { a: { b: 3 } }, cond: false },
  ],
};

```
      
### Eval output
(kind: ok) {"result":"early return"}
[2]
{"result":"early return"}
[[ (exception in render) TypeError: Cannot read properties of undefined (reading 'b') ]]
[null]
[[ (exception in render) TypeError: Cannot read properties of null (reading 'b') ]]
[3]