
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees
import {useCallback} from 'react';

function useHook(maybeRef) {
  return useCallback(() => {
    return [maybeRef.current];
  }, [maybeRef]);
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validatePreserveExistingMemoizationGuarantees
import { useCallback } from "react";

function useHook(maybeRef) {
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