
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees

import {useCallback} from 'react';

// False positive:
// We currently bail out on this because we don't understand
// that `() => [x]` gets pruned because `x` always invalidates.
function useFoo(props) {
  const x = [];
  useHook();
  x.push(props);

  return useCallback(() => [x], [x]);
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

error.todo-useCallback-captures-invalidating-value.ts:13:21
  11 |   x.push(props);
  12 |
> 13 |   return useCallback(() => [x], [x]);
     |                      ^^^^^^^^^ Could not preserve existing memoization
  14 | }
  15 |
  16 | export const FIXTURE_ENTRYPOINT = {
```
          
      