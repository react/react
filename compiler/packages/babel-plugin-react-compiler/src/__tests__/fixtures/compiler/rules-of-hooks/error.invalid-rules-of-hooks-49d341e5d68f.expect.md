
## Input

```javascript
// Expected to fail

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function useLabeledBlock() {
  label: {
    if (a) break label;
    useHook();
  }
}

```


## Error

```
Found 1 error:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-rules-of-hooks-49d341e5d68f.ts:8:4
   6 |   label: {
   7 |     if (a) break label;
>  8 |     useHook();
     |     ^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
   9 |   }
  10 | }
  11 |
```
          
      