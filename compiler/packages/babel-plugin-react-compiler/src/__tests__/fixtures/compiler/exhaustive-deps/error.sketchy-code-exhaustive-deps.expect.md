
## Input

```javascript
import {arrayPush} from 'shared-runtime';

// @validateExhaustiveMemoizationDependencies
function Component() {
  const item = [];
  const foo = useCallback(
    () => {
      arrayPush(item, 1);
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return <Button foo={foo} />;
}

```


## Error

```
Found 1 error:

Error: Found missing memoization dependencies

Missing dependencies can cause a value to update less often than it should, resulting in stale UI.

error.sketchy-code-exhaustive-deps.ts:8:16
   6 |   const foo = useCallback(
   7 |     () => {
>  8 |       arrayPush(item, 1);
     |                 ^^^^ Missing dependency `item`
   9 |     }, // eslint-disable-next-line react-hooks/exhaustive-deps
  10 |     []
  11 |   );

Inferred dependencies: `[item]`
```
          
      