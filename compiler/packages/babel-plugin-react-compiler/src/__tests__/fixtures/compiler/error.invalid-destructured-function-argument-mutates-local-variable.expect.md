
## Input

```javascript
// @validateNoFreezingKnownMutableFunctions

function useFoo() {
  const cache = new Map();
  const handlers = {
    onClick: () => {
      cache.set('key', 'value');
    },
  };
  const {onClick} = handlers;
  useHook(onClick);
}

```


## Error

```
Found 1 error:

Error: Cannot modify local variables after render completes

This argument is a function which may reassign or mutate `cache` after render, which can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.invalid-destructured-function-argument-mutates-local-variable.ts:11:10
   9 |   };
  10 |   const {onClick} = handlers;
> 11 |   useHook(onClick);
     |           ^^^^^^^ This function may (indirectly) reassign or modify `cache` after render
  12 | }
  13 |

error.invalid-destructured-function-argument-mutates-local-variable.ts:7:6
   5 |   const handlers = {
   6 |     onClick: () => {
>  7 |       cache.set('key', 'value');
     |       ^^^^^ This modifies `cache`
   8 |     },
   9 |   };
  10 |   const {onClick} = handlers;
```
          
      