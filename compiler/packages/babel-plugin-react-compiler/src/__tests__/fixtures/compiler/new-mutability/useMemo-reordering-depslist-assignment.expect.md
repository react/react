
## Input

```javascript
// @enableNewMutationAliasingModel @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';

function useFoo(arr1, arr2) {
  const x = [arr1];

  let y;
  return useMemo(() => {
    return {y};
  }, [((y = x.concat(arr2)), y)]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [
    [1, 2],
    [3, 4],
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @enableNewMutationAliasingModel @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import { useMemo } from "react";

function useFoo(arr1, arr2) {
  const $ = _c(7);
  let t0;
  if ($[0] !== arr1) {
    t0 = [arr1];
    $[0] = arr1;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const x = t0;
  let y;
  if ($[2] !== arr2 || $[3] !== x) {
    (y = x.concat(arr2)), y;
    $[2] = arr2;
    $[3] = x;
    $[4] = y;
  } else {
    y = $[4];
  }
  let t1;
  if ($[5] !== y) {
    t1 = { y };
    $[5] = y;
    $[6] = t1;
  } else {
    t1 = $[6];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [
    [1, 2],
    [3, 4],
  ],
};

```
      
### Eval output
(kind: ok) {"y":[[1,2],3,4]}