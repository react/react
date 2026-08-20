
## Input

```javascript
// Expected to fail

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function useHookInLoops() {
  while (a) {
    useHook1();
    if (b) return;
    useHook2();
  }
  while (c) {
    useHook3();
    if (d) return;
    useHook4();
  }
}

```


## Error

```
Found 4 errors:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-rules-of-hooks-1b9527f967f3.ts:7:4
   5 | function useHookInLoops() {
   6 |   while (a) {
>  7 |     useHook1();
     |     ^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
   8 |     if (b) return;
   9 |     useHook2();
  10 |   }

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-rules-of-hooks-1b9527f967f3.ts:9:4
   7 |     useHook1();
   8 |     if (b) return;
>  9 |     useHook2();
     |     ^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  10 |   }
  11 |   while (c) {
  12 |     useHook3();

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-rules-of-hooks-1b9527f967f3.ts:12:4
  10 |   }
  11 |   while (c) {
> 12 |     useHook3();
     |     ^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  13 |     if (d) return;
  14 |     useHook4();
  15 |   }

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-rules-of-hooks-1b9527f967f3.ts:14:4
  12 |     useHook3();
  13 |     if (d) return;
> 14 |     useHook4();
     |     ^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  15 |   }
  16 | }
  17 |
```
          
      