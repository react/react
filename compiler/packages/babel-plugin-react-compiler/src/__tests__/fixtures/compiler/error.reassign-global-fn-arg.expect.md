
## Input

```javascript
let b = 1;

export default function MyApp() {
  const fn = () => {
    b = 2;
  };
  return foo(fn);
}

function foo(fn) {}

export const FIXTURE_ENTRYPOINT = {
  fn: MyApp,
  params: [],
};

```


## Error

```
Found 1 error:

Error: Cannot reassign variables declared outside of the component/hook

Variable `b` is declared outside of the component/hook. Reassigning this value during render is a form of side effect, which can cause unpredictable behavior depending on when the component happens to re-render. If this variable is used in rendering, use useState instead. Otherwise, consider updating it in an effect. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#side-effects-must-run-outside-of-render).

error.reassign-global-fn-arg.ts:5:4
  3 | export default function MyApp() {
  4 |   const fn = () => {
> 5 |     b = 2;
    |     ^ `b` cannot be reassigned
  6 |   };
  7 |   return foo(fn);
  8 | }
```
          
      