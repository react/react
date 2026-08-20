
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees

import {useCallback} from 'react';

// More specific memoization always results in fewer memo block
// executions.
// Precisely:
//  x_new != x_prev does NOT imply x.y.z_new != x.y.z_prev
//  x.y.z_new != x.y.z_prev does imply x_new != x_prev
function useHook(x) {
  return useCallback(() => [x.y.z], [x]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [{y: {z: 2}}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees

import { useCallback } from "react";

// More specific memoization always results in fewer memo block
// executions.
// Precisely:
//  x_new != x_prev does NOT imply x.y.z_new != x.y.z_prev
//  x.y.z_new != x.y.z_prev does imply x_new != x_prev
function useHook(x) {
  const $ = _c(2);
  let t0;
  if ($[0] !== x.y.z) {
    t0 = () => [x.y.z];
    $[0] = x.y.z;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useHook,
  params: [{ y: { z: 2 } }],
};

```
      
### Eval output
(kind: ok) "[[ function params=0 ]]"