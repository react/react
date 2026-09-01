
## Input

```javascript
// Expected to fail

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function useHookInLoops() {
  while (a) {
    useHook1();
    if (b) continue;
    useHook2();
  }
}

```


## Error

```
Found 2 errors:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-rules-of-hooks-d85c144bdf40.ts:7:4
   5 | function useHookInLoops() {
   6 |   while (a) {
>  7 |     useHook1();
     |     ^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
   8 |     if (b) continue;
   9 |     useHook2();
  10 |   }

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-rules-of-hooks-d85c144bdf40.ts:9:4
   7 |     useHook1();
   8 |     if (b) continue;
>  9 |     useHook2();
     |     ^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  10 |   }
  11 | }
  12 |
```
          
      