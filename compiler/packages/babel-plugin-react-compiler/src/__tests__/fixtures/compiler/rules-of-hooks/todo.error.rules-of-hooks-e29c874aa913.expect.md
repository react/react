
## Input

```javascript
// @skip
// Unsupported input

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function useHook() {
  try {
    f();
    useState();
  } catch {}
}

```


## Error

```
Found 1 error:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

todo.error.rules-of-hooks-e29c874aa913.ts:9:4
   7 |   try {
   8 |     f();
>  9 |     useState();
     |     ^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  10 |   } catch {}
  11 | }
  12 |
```
          
      