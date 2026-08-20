
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees
import {useCallback} from 'react';
import {identity, useIdentity} from 'shared-runtime';

function mutate(_: unknown) {}

/**
 * Repro showing a manual memo whose declaration (useCallback's 1st argument)
 * is memoized, but not its dependency (x). In this case, `x`'s scope is pruned
 * due to hook-call flattening.
 */
function useFoo(a) {
  const x = identity(a);
  useIdentity(2);
  mutate(x);

  return useCallback(() => [x, []], [x]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [3],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees
import { useCallback } from "react";
import { identity, useIdentity } from "shared-runtime";

function mutate(_) {}

/**
 * Repro showing a manual memo whose declaration (useCallback's 1st argument)
 * is memoized, but not its dependency (x). In this case, `x`'s scope is pruned
 * due to hook-call flattening.
 */
function useFoo(a) {
  const $ = _c(2);
  const x = identity(a);
  useIdentity(2);
  mutate(x);
  let t0;
  if ($[0] !== x) {
    t0 = () => [x, []];
    $[0] = x;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [3],
};

```
      
### Eval output
(kind: ok) "[[ function params=0 ]]"