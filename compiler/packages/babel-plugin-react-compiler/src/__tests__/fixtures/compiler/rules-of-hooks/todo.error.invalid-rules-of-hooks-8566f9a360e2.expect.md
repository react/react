
## Input

```javascript
// @skip
// Passed but should have failed

// Invalid because it's dangerous and might not warn otherwise.
// This *must* be invalid.
const MemoizedButton = memo(function (props) {
  if (props.fancy) {
    useCustomHook();
  }
  return <button>{props.children}</button>;
});

```


## Error

```
Found 1 error:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

todo.error.invalid-rules-of-hooks-8566f9a360e2.ts:8:4
   6 | const MemoizedButton = memo(function (props) {
   7 |   if (props.fancy) {
>  8 |     useCustomHook();
     |     ^^^^^^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
   9 |   }
  10 |   return <button>{props.children}</button>;
  11 | });
```
          
      