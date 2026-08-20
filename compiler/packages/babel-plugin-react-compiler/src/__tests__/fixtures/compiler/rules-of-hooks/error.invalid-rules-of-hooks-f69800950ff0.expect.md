
## Input

```javascript
// Expected to fail

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function useHook({bar}) {
  let foo1 = bar && useState();
  let foo2 = bar || useState();
  let foo3 = bar ?? useState();
}

```


## Error

```
Found 3 errors:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-rules-of-hooks-f69800950ff0.ts:6:20
  4 | // This *must* be invalid.
  5 | function useHook({bar}) {
> 6 |   let foo1 = bar && useState();
    |                     ^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  7 |   let foo2 = bar || useState();
  8 |   let foo3 = bar ?? useState();
  9 | }

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-rules-of-hooks-f69800950ff0.ts:7:20
   5 | function useHook({bar}) {
   6 |   let foo1 = bar && useState();
>  7 |   let foo2 = bar || useState();
     |                     ^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
   8 |   let foo3 = bar ?? useState();
   9 | }
  10 |

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-rules-of-hooks-f69800950ff0.ts:8:20
   6 |   let foo1 = bar && useState();
   7 |   let foo2 = bar || useState();
>  8 |   let foo3 = bar ?? useState();
     |                     ^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
   9 | }
  10 |
```
          
      