
## Input

```javascript
// @compilationMode:"infer"
function Component() {
  return <Foo />;

  // This is unreachable from a control-flow perspective, but it gets hoisted
  function Foo() {}
}

```


## Error

```
Found 1 error:

Invariant: [InferMutationAliasingEffects] Expected value kind to be initialized

<unknown> Foo$0.

error.todo-hoisted-function-in-unreachable-code.ts:3:10
  1 | // @compilationMode:"infer"
  2 | function Component() {
> 3 |   return <Foo />;
    |           ^^^ this is uninitialized
  4 |
  5 |   // This is unreachable from a control-flow perspective, but it gets hoisted
  6 |   function Foo() {}
```
          
      