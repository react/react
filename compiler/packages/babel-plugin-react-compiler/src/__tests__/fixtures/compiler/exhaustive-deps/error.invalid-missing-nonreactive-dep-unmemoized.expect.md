
## Input

```javascript
// @validateExhaustiveMemoizationDependencies

import {useMemo} from 'react';
import {makeObject_Primitives, useIdentity} from 'shared-runtime';

function useHook() {
  // object is non-reactive but not memoized bc the mutation surrounds a hook
  const object = makeObject_Primitives();
  useIdentity();
  object.x = 0;
  const array = useMemo(() => [object], []);
  return array;
}

```


## Error

```
Found 1 error:

Error: Found missing memoization dependencies

Missing dependencies can cause a value to update less often than it should, resulting in stale UI.

error.invalid-missing-nonreactive-dep-unmemoized.ts:11:31
   9 |   useIdentity();
  10 |   object.x = 0;
> 11 |   const array = useMemo(() => [object], []);
     |                                ^^^^^^ Missing dependency `object`
  12 |   return array;
  13 | }
  14 |

Inferred dependencies: `[object]`
```
          
      