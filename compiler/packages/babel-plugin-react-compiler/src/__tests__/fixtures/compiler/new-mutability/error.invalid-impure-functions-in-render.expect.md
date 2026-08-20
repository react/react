
## Input

```javascript
// @validateNoImpureFunctionsInRender @enableNewMutationAliasingModel

function Component() {
  const date = Date.now();
  const now = performance.now();
  const rand = Math.random();
  return <Foo date={date} now={now} rand={rand} />;
}

```


## Error

```
Found 3 errors:

Error: Cannot call impure function during render

`Date.now` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent).

error.invalid-impure-functions-in-render.ts:4:15
  2 |
  3 | function Component() {
> 4 |   const date = Date.now();
    |                ^^^^^^^^^^ Cannot call impure function
  5 |   const now = performance.now();
  6 |   const rand = Math.random();
  7 |   return <Foo date={date} now={now} rand={rand} />;

Error: Cannot call impure function during render

`performance.now` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent).

error.invalid-impure-functions-in-render.ts:5:14
  3 | function Component() {
  4 |   const date = Date.now();
> 5 |   const now = performance.now();
    |               ^^^^^^^^^^^^^^^^^ Cannot call impure function
  6 |   const rand = Math.random();
  7 |   return <Foo date={date} now={now} rand={rand} />;
  8 | }

Error: Cannot call impure function during render

`Math.random` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent).

error.invalid-impure-functions-in-render.ts:6:15
  4 |   const date = Date.now();
  5 |   const now = performance.now();
> 6 |   const rand = Math.random();
    |                ^^^^^^^^^^^^^ Cannot call impure function
  7 |   return <Foo date={date} now={now} rand={rand} />;
  8 | }
  9 |
```
          
      