
## Input

```javascript
// @skip
// Unsupported input

// Invalid because it's a common misunderstanding.
// We *could* make it valid but the runtime error could be confusing.
const ComponentWithHookInsideCallback = React.forwardRef((props, ref) => {
  useEffect(() => {
    useHookInsideCallback();
  });
  return <button {...props} ref={ref} />;
});

```


## Error

```
Found 1 error:

Error: Hooks must be called at the top level in the body of a function component or custom hook, and may not be called within function expressions. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

Cannot call hook within a function expression.

error.bail.rules-of-hooks-3d692676194b.ts:8:4
   6 | const ComponentWithHookInsideCallback = React.forwardRef((props, ref) => {
   7 |   useEffect(() => {
>  8 |     useHookInsideCallback();
     |     ^^^^^^^^^^^^^^^^^^^^^ Hooks must be called at the top level in the body of a function component or custom hook, and may not be called within function expressions. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
   9 |   });
  10 |   return <button {...props} ref={ref} />;
  11 | });
```
          
      