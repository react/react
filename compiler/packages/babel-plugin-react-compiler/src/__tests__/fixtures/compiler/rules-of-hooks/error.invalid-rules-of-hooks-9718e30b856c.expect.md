
## Input

```javascript
// Expected to fail

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
function useHook() {
  if (a) return;
  if (b) {
    console.log('true');
  } else {
    console.log('false');
  }
  useState();
}

```


## Error

```
Found 1 error:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-rules-of-hooks-9718e30b856c.ts:12:2
  10 |     console.log('false');
  11 |   }
> 12 |   useState();
     |   ^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  13 | }
  14 |
```
          
      