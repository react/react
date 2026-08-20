
## Input

```javascript
// @validateNoFreezingKnownMutableFunctions

function useFoo() {
  const cache = new Map();
  useHook(() => {
    cache.set('key', 'value');
  });
}

```


## Error

```
Found 1 error:

Error: Cannot modify local variables after render completes

This argument is a function which may reassign or mutate `cache` after render, which can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.invalid-hook-function-argument-mutates-local-variable.ts:5:10
  3 | function useFoo() {
  4 |   const cache = new Map();
> 5 |   useHook(() => {
    |           ^^^^^^^
> 6 |     cache.set('key', 'value');
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 7 |   });
    | ^^^^ This function may (indirectly) reassign or modify `cache` after render
  8 | }
  9 |

error.invalid-hook-function-argument-mutates-local-variable.ts:6:4
  4 |   const cache = new Map();
  5 |   useHook(() => {
> 6 |     cache.set('key', 'value');
    |     ^^^^^ This modifies `cache`
  7 |   });
  8 | }
  9 |
```
          
      