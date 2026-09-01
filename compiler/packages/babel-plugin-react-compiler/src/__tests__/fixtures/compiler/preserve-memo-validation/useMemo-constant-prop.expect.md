
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees
import {useMemo} from 'react';
import {identity} from 'shared-runtime';

function useFoo(cond) {
  const sourceDep = 0;
  const derived1 = useMemo(() => {
    return identity(sourceDep);
  }, [sourceDep]);
  const derived2 = (cond ?? Math.min(sourceDep, 1)) ? 1 : 2;
  const derived3 = useMemo(() => {
    return identity(sourceDep);
  }, [sourceDep]);
  const derived4 = (Math.min(sourceDep, -1) ?? cond) ? 1 : 2;
  return [derived1, derived2, derived3, derived4];
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [true],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees
import { useMemo } from "react";
import { identity } from "shared-runtime";

function useFoo(cond) {
  const $ = _c(5);
  const sourceDep = 0;
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = identity(0);
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  const derived1 = t0;

  const derived2 = (cond ?? Math.min(0, 1)) ? 1 : 2;
  let t1;
  if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = identity(0);
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const derived3 = t1;

  const derived4 = (Math.min(0, -1) ?? cond) ? 1 : 2;
  let t2;
  if ($[2] !== derived2 || $[3] !== derived4) {
    t2 = [derived1, derived2, derived3, derived4];
    $[2] = derived2;
    $[3] = derived4;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [true],
};

```
      
### Eval output
(kind: ok) [0,1,0,1]