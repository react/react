
## Input

```javascript
// @validateNoImpureFunctionsInRender
function Component({n}) {
  const fact = k => (k <= 1 ? Date.now() : fact(k - 1));
  const now = fact(n);
  return <div>{now}</div>;
}

```


## Error

```
Found 1 error:

Error: Cannot call impure function during render

`Date.now` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent).

error.invalid-impure-call-in-self-referencing-function-in-render.ts:3:30
  1 | // @validateNoImpureFunctionsInRender
  2 | function Component({n}) {
> 3 |   const fact = k => (k <= 1 ? Date.now() : fact(k - 1));
    |                               ^^^^^^^^^^ Cannot call impure function
  4 |   const now = fact(n);
  5 |   return <div>{now}</div>;
  6 | }
```
          
      