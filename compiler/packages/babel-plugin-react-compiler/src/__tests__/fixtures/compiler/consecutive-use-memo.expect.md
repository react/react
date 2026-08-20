
## Input

```javascript
import {useMemo} from 'react';
import {identity} from 'shared-runtime';

function useHook({a, b}) {
  const valA = useMemo(() => identity({a}), [a]);
  const valB = useMemo(() => identity([b]), [b]);
  return [valA, valB];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [{a: 2, b: 3}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { useMemo } from "react";
import { identity } from "shared-runtime";

function useHook(t0) {
  const $ = _c(7);
  const { a, b } = t0;
  let t1;
  if ($[0] !== a) {
    t1 = identity({ a });
    $[0] = a;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const valA = t1;
  let t2;
  if ($[2] !== b) {
    t2 = identity([b]);
    $[2] = b;
    $[3] = t2;
  } else {
    t2 = $[3];
  }
  const valB = t2;
  let t3;
  if ($[4] !== valA || $[5] !== valB) {
    t3 = [valA, valB];
    $[4] = valA;
    $[5] = valB;
    $[6] = t3;
  } else {
    t3 = $[6];
  }
  return t3;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [{ a: 2, b: 3 }],
};

```
      
### Eval output
(kind: ok) [{"a":2},[3]]