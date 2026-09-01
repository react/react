
## Input

```javascript
let renderCount = 0;
function useFoo() {
  renderCount += 1;
  return renderCount;
}

export const FIXTURE_ENTRYPOINT = {
  fn: useFoo,
  params: [],
};

```


## Error

```
Found 1 error:

Error: Cannot reassign variables declared outside of the component/hook

Variable `renderCount` is declared outside of the component/hook. Reassigning this value during render is a form of side effect, which can cause unpredictable behavior depending on when the component happens to re-render. If this variable is used in rendering, use useState instead. Otherwise, consider updating it in an effect. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#side-effects-must-run-outside-of-render).

error.update-global-should-bailout.ts:3:2
  1 | let renderCount = 0;
  2 | function useFoo() {
> 3 |   renderCount += 1;
    |   ^^^^^^^^^^^^^^^^ `renderCount` cannot be reassigned
  4 |   return renderCount;
  5 | }
  6 |
```
          
      