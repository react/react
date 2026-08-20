
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees

import {useMemo} from 'react';
import {useHook} from 'shared-runtime';

// useMemo values may not be memoized in Forget output if we
// infer that their deps always invalidate.
// This is technically a false positive as the useMemo in source
// was effectively a no-op
function useFoo(props) {
  const x = [];
  useHook();
  x.push(props);

  return useMemo(() => [x], [x]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [{}],
};

```


## Error

```
Found 1 error:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This value was memoized in source but not in compilation output.

error.false-positive-useMemo-dropped-infer-always-invalidating.ts:15:9
  13 |   x.push(props);
  14 |
> 15 |   return useMemo(() => [x], [x]);
     |          ^^^^^^^^^^^^^^^^^^^^^^^ Could not preserve existing memoization
  16 | }
  17 |
  18 | export const FIXTURE_ENTRYPOINT = {
```
          
      