
## Input

```javascript
import {useEffect} from 'react';

function Component() {
  let local = 0;

  const reassignLocal = newValue => {
    local++;
  };

  const onMount = newValue => {
    reassignLocal('hello');

    if (local === newValue) {
      console.log('`local` was updated!');
    } else {
      throw new Error('`local` not updated!');
    }
  };

  useEffect(() => {
    onMount();
  }, [onMount]);

  return null;
}

```


## Error

```
Found 2 errors:

Error: Cannot reassign variable after render completes

Reassigning `local` after render has completed can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.invalid-update-expression-context-variable-in-effect.ts:7:4
   5 |
   6 |   const reassignLocal = newValue => {
>  7 |     local++;
     |     ^^^^^ Cannot reassign `local` after render completes
   8 |   };
   9 |
  10 |   const onMount = newValue => {

Error: Cannot modify local variables after render completes

This argument is a function which may reassign or mutate `local` after render, which can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.invalid-update-expression-context-variable-in-effect.ts:20:12
  18 |   };
  19 |
> 20 |   useEffect(() => {
     |             ^^^^^^^
> 21 |     onMount();
     | ^^^^^^^^^^^^^^
> 22 |   }, [onMount]);
     | ^^^^ This function may (indirectly) reassign or modify `local` after render
  23 |
  24 |   return null;
  25 | }

error.invalid-update-expression-context-variable-in-effect.ts:7:4
   5 |
   6 |   const reassignLocal = newValue => {
>  7 |     local++;
     |     ^^^^^ This modifies `local`
   8 |   };
   9 |
  10 |   const onMount = newValue => {
```
          
      