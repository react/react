
## Input

```javascript
// @validatePreserveExistingMemoizationGuarantees @enablePreserveExistingMemoizationGuarantees:false

import {useCallback} from 'react';
import {makeArray} from 'shared-runtime';

// This case is already unsound in source, so we can safely bailout
function Foo(props) {
  let x = [];
  x.push(props);

  // makeArray() is captured, but depsList contains [props]
  const cb = useCallback(() => [x], [x]);

  x = makeArray();

  return cb;
}
export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};

```


## Error

```
Found 2 errors:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This dependency may be mutated later, which could cause the value to change unexpectedly.

error.invalid-useCallback-captures-reassigned-context.ts:12:37
  10 |
  11 |   // makeArray() is captured, but depsList contains [props]
> 12 |   const cb = useCallback(() => [x], [x]);
     |                                      ^ This dependency may be modified later
  13 |
  14 |   x = makeArray();
  15 |

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This value was memoized in source but not in compilation output.

error.invalid-useCallback-captures-reassigned-context.ts:12:25
  10 |
  11 |   // makeArray() is captured, but depsList contains [props]
> 12 |   const cb = useCallback(() => [x], [x]);
     |                          ^^^^^^^^^ Could not preserve existing memoization
  13 |
  14 |   x = makeArray();
  15 |
```
          
      