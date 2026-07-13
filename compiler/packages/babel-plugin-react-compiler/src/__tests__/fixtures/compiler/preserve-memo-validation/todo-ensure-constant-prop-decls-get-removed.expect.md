
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false

import {useMemo} from 'react';

// Todo: we currently only generate a `constVal` declaration when
// validatePreserveExistingMemoizationGuarantees is enabled, as the
// StartMemoize instruction uses `constVal`.
// Fix is to rewrite StartMemoize instructions to remove constant
// propagated values
function useFoo() {
  const constVal = 0;

  return useMemo(() => [constVal], [constVal]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false

import { useMemo } from "react";

// Todo: we currently only generate a `constVal` declaration when
// validatePreserveExistingMemoizationGuarantees is enabled, as the
// StartMemoize instruction uses `constVal`.
// Fix is to rewrite StartMemoize instructions to remove constant
// propagated values
function useFoo() {
  const $ = _c(1);
  const constVal = 0;
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [0];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{}],
};

```
      
### Eval output
(kind: ok) [0]