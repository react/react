
## Input

```javascript
let counter = 0;

function Component() {
  function bump() {
    counter = counter + 1;
    later();
  }
  function later() {}
  bump();
  return <div />;
}

```


## Error

```
Found 1 error:

Error: Cannot reassign variables declared outside of the component/hook

Variable `counter` is declared outside of the component/hook. Reassigning this value during render is a form of side effect, which can cause unpredictable behavior depending on when the component happens to re-render. If this variable is used in rendering, use useState instead. Otherwise, consider updating it in an effect. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#side-effects-must-run-outside-of-render).

error.invalid-global-reassign-via-later-declared-function-in-render.ts:5:4
  3 | function Component() {
  4 |   function bump() {
> 5 |     counter = counter + 1;
    |     ^^^^^^^ `counter` cannot be reassigned
  6 |     later();
  7 |   }
  8 |   function later() {}
```
          
      