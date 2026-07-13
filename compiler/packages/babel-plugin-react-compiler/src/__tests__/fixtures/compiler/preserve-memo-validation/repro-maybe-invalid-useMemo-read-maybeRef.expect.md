
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';

function useHook(maybeRef, shouldRead) {
  return useMemo(() => {
    return () => [maybeRef.current];
  }, [shouldRead, maybeRef]);
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false
import { useMemo } from "react";

function useHook(maybeRef, shouldRead) {
  const $ = _c(2);
  let t0;
  if ($[0] !== maybeRef) {
    t0 = () => [maybeRef.current];
    $[0] = maybeRef;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

```
      
### Eval output
(kind: exception) Fixture not implemented