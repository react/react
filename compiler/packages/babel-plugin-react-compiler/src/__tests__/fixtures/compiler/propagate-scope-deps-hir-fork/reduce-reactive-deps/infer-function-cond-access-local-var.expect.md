
## Input

```javascript
// @enablePropagateDepsInHIR

import {shallowCopy, mutate, Stringify} from 'shared-runtime';

function useFoo({
  a,
  shouldReadA,
}: {
  a: {b: {c: number}; x: number};
  shouldReadA: boolean;
}) {
  const local = shallowCopy(a);
  mutate(local);
  return (
    <Stringify
      fn={() => {
        if (shouldReadA) return local.b.c;
        return null;
      }}
      shouldInvokeFns={true}
    />
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{a: null, shouldReadA: true}],
  sequentialRenders: [
    {a: null, shouldReadA: true},
    {a: null, shouldReadA: false},
    {a: {b: {c: 4}}, shouldReadA: true},
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enablePropagateDepsInHIR

import { shallowCopy, mutate, Stringify } from "shared-runtime";

function useFoo(t0) {
  const $ = _c(5);
  const { a, shouldReadA } = t0;
  let local;
  if ($[0] !== a) {
    local = shallowCopy(a);
    mutate(local);
    $[0] = a;
    $[1] = local;
  } else {
    local = $[1];
  }
  let t1;
  if ($[2] !== local || $[3] !== shouldReadA) {
    t1 = (
      <Stringify
        fn={() => {
          if (shouldReadA) {
            return local.b.c;
          }
          return null;
        }}
        shouldInvokeFns={true}
      />
    );
    $[2] = local;
    $[3] = shouldReadA;
    $[4] = t1;
  } else {
    t1 = $[4];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{ a: null, shouldReadA: true }],
  sequentialRenders: [
    { a: null, shouldReadA: true },
    { a: null, shouldReadA: false },
    { a: { b: { c: 4 } }, shouldReadA: true },
  ],
};

```
      
### Eval output
(kind: ok) [[ (exception in render) TypeError: Cannot read properties of undefined (reading 'c') ]]
<div>{"fn":{"kind":"Function","result":null},"shouldInvokeFns":true}</div>
<div>{"fn":{"kind":"Function","result":4},"shouldInvokeFns":true}</div>