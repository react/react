
## Input

```javascript
// @validateNoImpureFunctionsInRender

function Component() {
  const date = new Date();
  const time = new Date().getTime();
  const year = new Date().getFullYear();
  return <Foo date={date} time={time} year={year} />;
}

```


## Error

```
Found 3 errors:

Error: Cannot call impure function during render

`new Date` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent).

error.invalid-new-date-in-render.ts:4:15
  2 |
  3 | function Component() {
> 4 |   const date = new Date();
    |                ^^^^^^^^^^ Cannot call impure function
  5 |   const time = new Date().getTime();
  6 |   const year = new Date().getFullYear();
  7 |   return <Foo date={date} time={time} year={year} />;

Error: Cannot call impure function during render

`new Date` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent).

error.invalid-new-date-in-render.ts:5:15
  3 | function Component() {
  4 |   const date = new Date();
> 5 |   const time = new Date().getTime();
    |                ^^^^^^^^^^ Cannot call impure function
  6 |   const year = new Date().getFullYear();
  7 |   return <Foo date={date} time={time} year={year} />;
  8 | }

Error: Cannot call impure function during render

`new Date` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent).

error.invalid-new-date-in-render.ts:6:15
  4 |   const date = new Date();
  5 |   const time = new Date().getTime();
> 6 |   const year = new Date().getFullYear();
    |                ^^^^^^^^^^ Cannot call impure function
  7 |   return <Foo date={date} time={time} year={year} />;
  8 | }
  9 |
```
          
      