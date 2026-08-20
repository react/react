
## Input

```javascript
// Invalid because it's a common misunderstanding.
// We *could* make it valid but the runtime error could be confusing.
function createComponent() {
  return function ComponentWithHookInsideCallback() {
    useEffect(() => {
      useHookInsideCallback();
    });
  };
}

```


## Error

```
Found 2 errors:

Error: Hooks must be called at the top level in the body of a function component or custom hook, and may not be called within function expressions. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

Cannot call hook within a function expression.

error.invalid.invalid-rules-of-hooks-0de1224ce64b.ts:6:6
  4 |   return function ComponentWithHookInsideCallback() {
  5 |     useEffect(() => {
> 6 |       useHookInsideCallback();
    |       ^^^^^^^^^^^^^^^^^^^^^ Hooks must be called at the top level in the body of a function component or custom hook, and may not be called within function expressions. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  7 |     });
  8 |   };
  9 | }

Error: Hooks must be called at the top level in the body of a function component or custom hook, and may not be called within function expressions. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

Cannot call useEffect within a function expression.

error.invalid.invalid-rules-of-hooks-0de1224ce64b.ts:5:4
  3 | function createComponent() {
  4 |   return function ComponentWithHookInsideCallback() {
> 5 |     useEffect(() => {
    |     ^^^^^^^^^ Hooks must be called at the top level in the body of a function component or custom hook, and may not be called within function expressions. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  6 |       useHookInsideCallback();
  7 |     });
  8 |   };
```
          
      