
## Input

```javascript
// @validateNoImpureFunctionsInRender
function Component() {
  const read = () => later();
  const later = () => Date.now();
  const now = read();
  return <div>{now}</div>;
}

```


## Error

```
Found 1 error:

Error: Cannot call impure function during render

`Date.now` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent).

error.invalid-impure-call-via-later-declared-function-in-render.ts:4:22
  2 | function Component() {
  3 |   const read = () => later();
> 4 |   const later = () => Date.now();
    |                       ^^^^^^^^^^ Cannot call impure function
  5 |   const now = read();
  6 |   return <div>{now}</div>;
  7 | }
```
          
      