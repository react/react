
## Input

```javascript
// Expected to fail

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function ComponentWithTernaryHook() {
  cond ? useTernaryHook() : null;
}

```


## Error

```
Found 1 error:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-rules-of-hooks-b4dcda3d60ed.ts:6:9
  4 | // This *must* be invalid.
  5 | function ComponentWithTernaryHook() {
> 6 |   cond ? useTernaryHook() : null;
    |          ^^^^^^^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  7 | }
  8 |
```
          
      