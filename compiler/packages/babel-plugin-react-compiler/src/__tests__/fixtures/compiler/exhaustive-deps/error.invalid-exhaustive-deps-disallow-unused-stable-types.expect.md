
## Input

```javascript
// @validateExhaustiveMemoizationDependencies

import {useState} from 'react';
import {Stringify} from 'shared-runtime';

function Component() {
  const [state, setState] = useState(0);
  const x = useMemo(() => {
    return [state];
    // error: `setState` is a stable type, but not actually referenced
  }, [state, setState]);

  return 'oops';
}

```


## Error

```
Found 1 error:

Error: Found extra memoization dependencies

Extra dependencies can cause a value to update more often than it should, resulting in performance problems such as excessive renders or effects firing too often.

error.invalid-exhaustive-deps-disallow-unused-stable-types.ts:11:13
   9 |     return [state];
  10 |     // error: `setState` is a stable type, but not actually referenced
> 11 |   }, [state, setState]);
     |              ^^^^^^^^ Unnecessary dependency `setState`
  12 |
  13 |   return 'oops';
  14 | }

Inferred dependencies: `[state]`
```
          
      