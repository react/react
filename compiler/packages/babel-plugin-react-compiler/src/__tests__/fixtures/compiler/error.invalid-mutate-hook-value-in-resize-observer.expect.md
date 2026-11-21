
## Input

```javascript
import {useMemo} from 'react';

function Component() {
  const items = useMemo(() => [], []);
  return new ResizeObserver(() => {
    items.push(1);
  });
}

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying a value previously passed as an argument to a hook is not allowed. Consider moving the modification before calling the hook.

error.invalid-mutate-hook-value-in-resize-observer.ts:6:4
  4 |   const items = useMemo(() => [], []);
  5 |   return new ResizeObserver(() => {
> 6 |     items.push(1);
    |     ^^^^^ `items` cannot be modified
  7 |   });
  8 | }
  9 |
```
          
      