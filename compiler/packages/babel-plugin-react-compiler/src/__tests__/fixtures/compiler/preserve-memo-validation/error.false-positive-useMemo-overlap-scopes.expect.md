
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees:true
import {useMemo} from 'react';
import {arrayPush} from 'shared-runtime';

/**
 * Repro showing differences between mutable ranges and scope ranges.
 *
 * For useMemo dependency `x`:
 * - mutable range ends after the `arrayPush(x, b)` instruction
 * - scope range is extended due to MergeOverlappingScopes
 *
 * Since manual memo deps are guaranteed to be named (guaranteeing valid
 * codegen), it's correct to take a dependency on a dep *before* the end
 * of its scope (but after its mutable range ends).
 */

function useFoo(a, b) {
  const x = [];
  const y = [];
  arrayPush(x, b);
  const result = useMemo(() => {
    return [Math.max(x[1], a)];
  }, [a, x]);
  arrayPush(y, 3);
  return {result, y};
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [1, 2],
};

```


## Error

```
Found 1 error:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This dependency may be mutated later, which could cause the value to change unexpectedly.

error.false-positive-useMemo-overlap-scopes.ts:23:9
  21 |   const result = useMemo(() => {
  22 |     return [Math.max(x[1], a)];
> 23 |   }, [a, x]);
     |          ^ This dependency may be modified later
  24 |   arrayPush(y, 3);
  25 |   return {result, y};
  26 | }
```
          
      