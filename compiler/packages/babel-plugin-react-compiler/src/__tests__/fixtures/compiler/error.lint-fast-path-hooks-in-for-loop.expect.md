
## Input

```javascript
// @loggerTestOnly @outputMode:"lint" @enableLintFastPath
/**
 * Without the fast path, a later pass throws an invariant for this function
 * (see rules-of-hooks/error.invalid-hook-for.js), which replaces the Rules of
 * Hooks errors recorded earlier. With the fast path, those errors are reported.
 */
function Component(props) {
  let i = 0;
  for (let x = 0; useHook(x) < 10; useHook(i), x++) {
    i += useHook(x);
  }
  return i;
}

```


## Error

```
Found 2 errors:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.lint-fast-path-hooks-in-for-loop.ts:10:9
   8 |   let i = 0;
   9 |   for (let x = 0; useHook(x) < 10; useHook(i), x++) {
> 10 |     i += useHook(x);
     |          ^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  11 |   }
  12 |   return i;
  13 | }

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.lint-fast-path-hooks-in-for-loop.ts:9:35
   7 | function Component(props) {
   8 |   let i = 0;
>  9 |   for (let x = 0; useHook(x) < 10; useHook(i), x++) {
     |                                    ^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  10 |     i += useHook(x);
  11 |   }
  12 |   return i;
```
          
      