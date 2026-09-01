
## Input

```javascript
// @validateNoFreezingKnownMutableFunctions
import {useHook} from 'shared-runtime';

function useFoo() {
  useHook(); // for inference to kick in
  const cache = new Map();
  return () => {
    cache.set('key', 'value');
  };
}

```


## Error

```
Found 1 error:

Error: Cannot modify local variables after render completes

This argument is a function which may reassign or mutate `cache` after render, which can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.invalid-return-mutable-function-from-hook.ts:7:9
   5 |   useHook(); // for inference to kick in
   6 |   const cache = new Map();
>  7 |   return () => {
     |          ^^^^^^^
>  8 |     cache.set('key', 'value');
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
>  9 |   };
     | ^^^^ This function may (indirectly) reassign or modify `cache` after render
  10 | }
  11 |

error.invalid-return-mutable-function-from-hook.ts:8:4
   6 |   const cache = new Map();
   7 |   return () => {
>  8 |     cache.set('key', 'value');
     |     ^^^^^ This modifies `cache`
   9 |   };
  10 | }
  11 |
```
          
      