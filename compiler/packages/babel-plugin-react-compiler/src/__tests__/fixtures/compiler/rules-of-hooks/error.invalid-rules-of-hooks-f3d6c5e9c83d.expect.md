
## Input

```javascript
// Expected to fail

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function useHook() {
  if (b) {
    console.log('true');
  } else {
    console.log('false');
  }
  if (a) return;
  useState();
}

```


## Error

```
Found 1 error:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-rules-of-hooks-f3d6c5e9c83d.ts:12:2
  10 |   }
  11 |   if (a) return;
> 12 |   useState();
     |   ^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  13 | }
  14 |
```
          
      