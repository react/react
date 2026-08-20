
## Input

```javascript
// @enablePropagateDepsInHIR

import {identity, makeArray, Stringify, useIdentity} from 'shared-runtime';

function Foo({a, cond}) {
  // Assume fn can be uncond evaluated, so we can safely evaluate a.b?.c.<any>
  const fn = () => [a, a.b?.c.d];
  useIdentity(null);
  const arr = makeArray();
  if (cond) {
    arr.push(identity(a.b?.c.e));
  }
  return <Stringify fn={fn} arr={arr} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{a: null, cond: true}],
  sequentialRenders: [
    {a: null, cond: true},
    {a: {b: {c: {d: 5}}}, cond: true},
    {a: {b: null}, cond: false},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR

import { identity, makeArray, Stringify, useIdentity } from "shared-runtime";

function Foo(t0) {
  const $ = _c(8);
  const { a, cond } = t0;
  let t1;
  if ($[0] !== a) {
    t1 = () => [a, a.b?.c.d];
    $[0] = a;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const fn = t1;
  useIdentity(null);
  let arr;
  if ($[2] !== a.b?.c.e || $[3] !== cond) {
    arr = makeArray();
    if (cond) {
      arr.push(identity(a.b?.c.e));
    }
    $[2] = a.b?.c.e;
    $[3] = cond;
    $[4] = arr;
  } else {
    arr = $[4];
  }
  let t2;
  if ($[5] !== arr || $[6] !== fn) {
    t2 = <Stringify fn={fn} arr={arr} shouldInvokeFns={true} />;
    $[5] = arr;
    $[6] = fn;
    $[7] = t2;
  } else {
    t2 = $[7];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{ a: null, cond: true }],
  sequentialRenders: [
    { a: null, cond: true },
    { a: { b: { c: { d: 5 } } }, cond: true },
    { a: { b: null }, cond: false },
  ],
};

```
      
### Eval output
(kind: ok) [[ (exception in render) TypeError: Cannot read properties of null (reading 'b') ]]
<div>{"fn":{"kind":"Function","result":[{"b":{"c":{"d":5}}},5]},"arr":[null],"shouldInvokeFns":true}</div>
<div>{"fn":{"kind":"Function","result":[{"b":null},null]},"arr":[],"shouldInvokeFns":true}</div>