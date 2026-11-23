
## Input

```javascript
import {useMemo} from 'react';

function Component() {
  const entries = useMemo(() => [], []);
  return new PerformanceObserver(() => {
    entries.push(1);
  });
}

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying a value previously passed as an argument to a hook is not allowed. Consider moving the modification before calling the hook.

error.invalid-mutate-hook-value-in-performance-observer.ts:6:4
  4 |   const entries = useMemo(() => [], []);
  5 |   return new PerformanceObserver(() => {
> 6 |     entries.push(1);
    |     ^^^^^^^ `entries` cannot be modified
  7 |   });
  8 | }
  9 |
```
          
      