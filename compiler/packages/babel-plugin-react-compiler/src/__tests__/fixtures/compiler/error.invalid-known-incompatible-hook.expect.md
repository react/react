
## Input

```javascript
import {useKnownIncompatible} from 'ReactCompilerKnownIncompatibleTest';

function Component() {
  const data = useKnownIncompatible();
  return <div>Error</div>;
}

```


## Error

```
Found 1 error:

Compilation Skipped: Use of incompatible library

This API returns functions which cannot be memoized without leading to stale UI. To prevent this, by default React Compiler will skip memoizing this component/hook. However, you may see issues if values from this API are passed to other components/hooks that are memoized.

error.invalid-known-incompatible-hook.ts:4:15
  2 |
  3 | function Component() {
> 4 |   const data = useKnownIncompatible();
    |                ^^^^^^^^^^^^^^^^^^^^ useKnownIncompatible is known to be incompatible
  5 |   return <div>Error</div>;
  6 | }
  7 |
```
          
      