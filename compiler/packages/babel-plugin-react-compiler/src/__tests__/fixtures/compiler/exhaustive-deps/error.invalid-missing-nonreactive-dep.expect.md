
## Input

```javascript
// @validateExhaustiveMemoizationDependencies

import {useMemo} from 'react';
import {makeObject_Primitives} from 'shared-runtime';

function useHook() {
  const object = makeObject_Primitives();
  const array = useMemo(() => [object], []);
  return array;
}

```


## Error

```
Found 1 error:

Error: Found missing memoization dependencies

Missing dependencies can cause a value to update less often than it should, resulting in stale UI.

error.invalid-missing-nonreactive-dep.ts:8:31
   6 | function useHook() {
   7 |   const object = makeObject_Primitives();
>  8 |   const array = useMemo(() => [object], []);
     |                                ^^^^^^ Missing dependency `object`
   9 |   return array;
  10 | }
  11 |

Inferred dependencies: `[object]`
```
          
      