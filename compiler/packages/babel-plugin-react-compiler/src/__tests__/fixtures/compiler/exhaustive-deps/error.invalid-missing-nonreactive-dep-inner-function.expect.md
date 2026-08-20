
## Input

```javascript
// @validateExhaustiveMemoizationDependencies

import {useMemo} from 'react';
import {makeObject_Primitives} from 'shared-runtime';

function useHook() {
  const object = makeObject_Primitives();
  const fn = useCallback(() => {
    const g = () => {
      return [object];
    };
    return g;
  });
  return fn;
}

```


## Error

```
Found 1 error:

Error: Found missing memoization dependencies

Missing dependencies can cause a value to update less often than it should, resulting in stale UI.

error.invalid-missing-nonreactive-dep-inner-function.ts:10:14
   8 |   const fn = useCallback(() => {
   9 |     const g = () => {
> 10 |       return [object];
     |               ^^^^^^ Missing dependency `object`
  11 |     };
  12 |     return g;
  13 |   });
```
          
      