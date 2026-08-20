
## Input

```javascript
// Expected to fail

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function ComponentWithHookInsideLoop() {
  while (cond) {
    useHookInsideLoop();
  }
}

```


## Error

```
Found 1 error:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-rules-of-hooks-79128a755612.ts:7:4
   5 | function ComponentWithHookInsideLoop() {
   6 |   while (cond) {
>  7 |     useHookInsideLoop();
     |     ^^^^^^^^^^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
   8 |   }
   9 | }
  10 |
```
          
      