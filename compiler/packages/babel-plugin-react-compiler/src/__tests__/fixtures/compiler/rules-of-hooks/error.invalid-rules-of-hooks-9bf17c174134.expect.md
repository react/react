
## Input

```javascript
// Expected to fail

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function useHook() {
  a && useHook1();
  b && useHook2();
}

```


## Error

```
Found 2 errors:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-rules-of-hooks-9bf17c174134.ts:6:7
  4 | // This *must* be invalid.
  5 | function useHook() {
> 6 |   a && useHook1();
    |        ^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  7 |   b && useHook2();
  8 | }
  9 |

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-rules-of-hooks-9bf17c174134.ts:7:7
  5 | function useHook() {
  6 |   a && useHook1();
> 7 |   b && useHook2();
    |        ^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  8 | }
  9 |
```
          
      