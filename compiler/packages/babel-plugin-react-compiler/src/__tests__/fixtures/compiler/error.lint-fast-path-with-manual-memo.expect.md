
## Input

```javascript
// @loggerTestOnly @validatePreserveExistingMemoizationGuarantees @enablePreserveExistingMemoizationGuarantees:false @outputMode:"lint" @enableLintFastPath
import {identity, useHook} from 'shared-runtime';

/**
 * Functions with manual memoization run the full pipeline so that
 * ValidatePreservedManualMemoization can still report errors.
 */
function useInputValue(input) {
  let x = {};
  useHook();
  const object = React.useMemo(() => {
    const {value} = identity(input, x);
    return {value};
  }, [input, x]);
  return object;
}

```


## Error

```
Found 1 error:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This dependency may be mutated later, which could cause the value to change unexpectedly.

error.lint-fast-path-with-manual-memo.ts:14:13
  12 |     const {value} = identity(input, x);
  13 |     return {value};
> 14 |   }, [input, x]);
     |              ^ This dependency may be modified later
  15 |   return object;
  16 | }
  17 |
```
          
      