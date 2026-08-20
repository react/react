
## Input

```javascript
function useFoo(props) {
  [x] = props;
  return {x};
}

```


## Error

```
Found 1 error:

Error: Cannot reassign variables declared outside of the component/hook

Variable `x` is declared outside of the component/hook. Reassigning this value during render is a form of side effect, which can cause unpredictable behavior depending on when the component happens to re-render. If this variable is used in rendering, use useState instead. Otherwise, consider updating it in an effect. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#side-effects-must-run-outside-of-render).

error.invalid-destructure-assignment-to-global.ts:2:3
  1 | function useFoo(props) {
> 2 |   [x] = props;
    |    ^ `x` cannot be reassigned
  3 |   return {x};
  4 | }
  5 |
```
          
      