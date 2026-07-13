
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false

import {useMemo} from 'react';
import {CONST_STRING0} from 'shared-runtime';

// It's correct to infer a useMemo block has no reactive dependencies
function useFoo() {
  return useMemo(() => [CONST_STRING0], [CONST_STRING0]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false

import { useMemo } from "react";
import { CONST_STRING0 } from "shared-runtime";

// It's correct to infer a useMemo block has no reactive dependencies
function useFoo() {
  const $ = _c(1);
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = [CONST_STRING0];
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```
      
### Eval output
(kind: ok) ["global string 0"]