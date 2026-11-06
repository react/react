
## Input

```javascript
// @validateNoFreezingKnownMutableFunctions

function useFoo() {
  const cache = new Map();
  const handlers = {
    onClick() {
      cache.set('key', 'value');
    },
  };
  useHook(handlers.onClick);
}

```


## Error

```
Found 1 error:

Error: Cannot modify local variables after render completes

This argument is a function which may reassign or mutate `cache` after render, which can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.invalid-object-method-argument-mutates-local-variable.ts:10:10
   8 |     },
   9 |   };
> 10 |   useHook(handlers.onClick);
     |           ^^^^^^^^^^^^^^^^ This function may (indirectly) reassign or modify `cache` after render
  11 | }
  12 |

error.invalid-object-method-argument-mutates-local-variable.ts:7:6
   5 |   const handlers = {
   6 |     onClick() {
>  7 |       cache.set('key', 'value');
     |       ^^^^^ This modifies `cache`
   8 |     },
   9 |   };
  10 |   useHook(handlers.onClick);
```
          
      