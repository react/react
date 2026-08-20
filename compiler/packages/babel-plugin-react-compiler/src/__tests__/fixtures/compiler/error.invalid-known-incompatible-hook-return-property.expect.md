
## Input

```javascript
import {useKnownIncompatibleIndirect} from 'ReactCompilerKnownIncompatibleTest';

function Component() {
  const {incompatible} = useKnownIncompatibleIndirect();
  return <div>{incompatible()}</div>;
}

```


## Error

```
Found 1 error:

Compilation Skipped: Use of incompatible library

This API returns functions which cannot be memoized without leading to stale UI. To prevent this, by default React Compiler will skip memoizing this component/hook. However, you may see issues if values from this API are passed to other components/hooks that are memoized.

error.invalid-known-incompatible-hook-return-property.ts:5:15
  3 | function Component() {
  4 |   const {incompatible} = useKnownIncompatibleIndirect();
> 5 |   return <div>{incompatible()}</div>;
    |                ^^^^^^^^^^^^ useKnownIncompatibleIndirect returns an incompatible() function that is known incompatible
  6 | }
  7 |
```
          
      