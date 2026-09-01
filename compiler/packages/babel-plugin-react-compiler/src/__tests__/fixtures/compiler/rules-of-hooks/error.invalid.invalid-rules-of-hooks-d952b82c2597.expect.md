
## Input

```javascript
// Invalid because it's a common misunderstanding.
// We *could* make it valid but the runtime error could be confusing.
function ComponentWithHookInsideCallback() {
  useEffect(() => {
    useHookInsideCallback();
  });
}

```


## Error

```
Found 1 error:

Error: Hooks must be called at the top level in the body of a function component or custom hook, and may not be called within function expressions. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

Cannot call hook within a function expression.

error.invalid.invalid-rules-of-hooks-d952b82c2597.ts:5:4
  3 | function ComponentWithHookInsideCallback() {
  4 |   useEffect(() => {
> 5 |     useHookInsideCallback();
    |     ^^^^^^^^^^^^^^^^^^^^^ Hooks must be called at the top level in the body of a function component or custom hook, and may not be called within function expressions. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  6 |   });
  7 | }
  8 |
```
          
      