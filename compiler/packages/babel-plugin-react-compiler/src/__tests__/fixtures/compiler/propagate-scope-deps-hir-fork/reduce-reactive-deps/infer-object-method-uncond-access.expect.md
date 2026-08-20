
## Input

```javascript
// @enablePropagateDepsInHIR

import {identity, Stringify} from 'shared-runtime';

function useFoo({a}) {
  const x = {
    fn() {
      return identity(a.b.c);
    },
  };
  return <Stringify x={x} shouldInvokeFns={true} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{a: null}],
  sequentialRenders: [{a: null}, {a: {b: {c: 4}}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR

import { identity, Stringify } from "shared-runtime";

function useFoo(t0) {
  const $ = _c(2);
  const { a } = t0;
  let t1;
  if ($[0] !== a) {
    const x = {
      fn() {
        return identity(a.b.c);
      },
    };
    t1 = <Stringify x={x} shouldInvokeFns={true} />;
    $[0] = a;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ a: null }],
  sequentialRenders: [{ a: null }, { a: { b: { c: 4 } } }],
};

```
      
### Eval output
(kind: ok) [[ (exception in render) TypeError: Cannot read properties of null (reading 'b') ]]
<div>{"x":{"fn":{"kind":"Function","result":4}},"shouldInvokeFns":true}</div>