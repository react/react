
## Input

```javascript
import {useMemo} from 'react';

function Component() {
  const entries = useMemo(() => [], []);
  return new ReportingObserver(
    () => {
      entries.push(1);
    },
    {buffered: true}
  );
}

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying a value previously passed as an argument to a hook is not allowed. Consider moving the modification before calling the hook.

error.invalid-mutate-hook-value-in-reporting-observer.ts:7:6
   5 |   return new ReportingObserver(
   6 |     () => {
>  7 |       entries.push(1);
     |       ^^^^^^^ `entries` cannot be modified
   8 |     },
   9 |     {buffered: true}
  10 |   );
```
          
      