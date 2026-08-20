
## Input

```javascript
// @enablePropagateDepsInHIR

import {Stringify} from 'shared-runtime';

function useFoo({a}) {
  return <Stringify fn={() => a.b?.c.d?.e} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{a: null}],
  sequentialRenders: [
    {a: null},
    {a: {b: null}},
    {a: {b: {c: {d: null}}}},
    {a: {b: {c: {d: {e: 4}}}}},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR

import { Stringify } from "shared-runtime";

function useFoo(t0) {
  const $ = _c(2);
  const { a } = t0;
  let t1;
  if ($[0] !== a.b?.c.d?.e) {
    t1 = <Stringify fn={() => a.b?.c.d?.e} shouldInvokeFns={true} />;
    $[0] = a.b?.c.d?.e;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ a: null }],
  sequentialRenders: [
    { a: null },
    { a: { b: null } },
    { a: { b: { c: { d: null } } } },
    { a: { b: { c: { d: { e: 4 } } } } },
  ],
};

```
      
### Eval output
(kind: ok) [[ (exception in render) TypeError: Cannot read properties of null (reading 'b') ]]
<div>{"fn":{"kind":"Function"},"shouldInvokeFns":true}</div>
<div>{"fn":{"kind":"Function"},"shouldInvokeFns":true}</div>
<div>{"fn":{"kind":"Function","result":4},"shouldInvokeFns":true}</div>