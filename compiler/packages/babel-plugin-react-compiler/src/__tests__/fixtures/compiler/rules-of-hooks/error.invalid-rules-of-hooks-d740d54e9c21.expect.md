
## Input

```javascript
// Expected to fail

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function normalFunctionWithConditionalHook() {
  if (cond) {
    useHookInsideNormalFunction();
  }
}

```


## Error

```
Found 1 error:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-rules-of-hooks-d740d54e9c21.ts:7:4
   5 | function normalFunctionWithConditionalHook() {
   6 |   if (cond) {
>  7 |     useHookInsideNormalFunction();
     |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
   8 |   }
   9 | }
  10 |
```
          
      