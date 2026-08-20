
## Input

```javascript
function Component() {
  const Foo = () => {
    someGlobal = true;
  };
  return <Foo />;
}

```


## Error

```
Found 1 error:

Error: Cannot reassign variables declared outside of the component/hook

Variable `someGlobal` is declared outside of the component/hook. Reassigning this value during render is a form of side effect, which can cause unpredictable behavior depending on when the component happens to re-render. If this variable is used in rendering, use useState instead. Otherwise, consider updating it in an effect. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#side-effects-must-run-outside-of-render).

error.assign-global-in-component-tag-function.ts:3:4
  1 | function Component() {
  2 |   const Foo = () => {
> 3 |     someGlobal = true;
    |     ^^^^^^^^^^ `someGlobal` cannot be reassigned
  4 |   };
  5 |   return <Foo />;
  6 | }
```
          
      