
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @enablePreserveExistingMemoizationGuarantees:false
import {useMemo} from 'react';
import {identity} from 'shared-runtime';

// This is a false positive as Forget's inferred memoization
// invalidates strictly less than source. We currently do not
// track transitive deps / invalidations of manual memo deps
// because of implementation complexity
function useFoo() {
  const val = [1, 2, 3];

  return useMemo(() => {
    return identity(val);
  }, [val]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```


## Error

```
Found 1 error:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This dependency may be mutated later, which could cause the value to change unexpectedly.

error.false-positive-useMemo-infer-mutate-deps.ts:14:6
  12 |   return useMemo(() => {
  13 |     return identity(val);
> 14 |   }, [val]);
     |       ^^^ This dependency may be modified later
  15 | }
  16 |
  17 | export const FIXTURE_ENTRYPOINT = {
```
          
      