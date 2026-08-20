
## Input

```javascript
import {arrayPush} from 'shared-runtime';

function useFoo({input, cond}) {
  if (cond) {
    throw new Error('throw with error!');
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
  const $ = _c(2);
  const { input, cond } = t0;
  if (cond) {
    throw new Error("throw with error!");
  }
  let x;
  if ($[0] !== input.a.b) {
    x = [];
    arrayPush(x, input.a.b);
    $[0] = input.a.b;
    $[1] = x;
  } else {
    x = $[1];
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
(kind: ok) [[ (exception in render) Error: throw with error! ]]
[2]
[[ (exception in render) Error: throw with error! ]]
[[ (exception in render) TypeError: Cannot read properties of undefined (reading 'b') ]]
[null]
[[ (exception in render) TypeError: Cannot read properties of null (reading 'b') ]]
[3]