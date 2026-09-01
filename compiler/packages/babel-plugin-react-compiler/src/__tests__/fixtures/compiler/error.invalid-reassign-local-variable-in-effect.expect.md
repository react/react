
## Input

```javascript
import {useEffect} from 'react';

function Component() {
  let local;

  const reassignLocal = newValue => {
    local = newValue;
  };

  const onMount = newValue => {
    reassignLocal('hello');

    if (local === newValue) {
      // Without React Compiler, `reassignLocal` is freshly created
      // on each render, capturing a binding to the latest `local`,
      // such that invoking reassignLocal will reassign the same
      // binding that we are observing in the if condition, and
      // we reach this branch
      console.log('`local` was updated!');
    } else {
      // With React Compiler enabled, `reassignLocal` is only created
      // once, capturing a binding to `local` in that render pass.
      // Therefore, calling `reassignLocal` will reassign the wrong
      // version of `local`, and not update the binding we are checking
      // in the if condition.
      //
      // To protect against this, we disallow reassigning locals from
      // functions that escape
      throw new Error('`local` not updated!');
    }
  };

  useEffect(() => {
    onMount();
  }, [onMount]);

  return 'ok';
}

```


## Error

```
Found 2 errors:

Error: Cannot reassign variable after render completes

Reassigning `local` after render has completed can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.invalid-reassign-local-variable-in-effect.ts:7:4
   5 |
   6 |   const reassignLocal = newValue => {
>  7 |     local = newValue;
     |     ^^^^^ Cannot reassign `local` after render completes
   8 |   };
   9 |
  10 |   const onMount = newValue => {

Error: Cannot modify local variables after render completes

This argument is a function which may reassign or mutate `local` after render, which can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.invalid-reassign-local-variable-in-effect.ts:33:12
  31 |   };
  32 |
> 33 |   useEffect(() => {
     |             ^^^^^^^
> 34 |     onMount();
     | ^^^^^^^^^^^^^^
> 35 |   }, [onMount]);
     | ^^^^ This function may (indirectly) reassign or modify `local` after render
  36 |
  37 |   return 'ok';
  38 | }

error.invalid-reassign-local-variable-in-effect.ts:7:4
   5 |
   6 |   const reassignLocal = newValue => {
>  7 |     local = newValue;
     |     ^^^^^ This modifies `local`
   8 |   };
   9 |
  10 |   const onMount = newValue => {
```
          
      