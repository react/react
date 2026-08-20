
## Input

```javascript
function Component(props: {obj: {x: unknown}}) {
  (props.obj.x as unknown as number) = 1;
  return <div>{props.obj.x as number}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{obj: {x: 0}}],
};

```


## Error

```
Found 1 error:

Todo: [FindContextIdentifiers] Cannot handle Object destructuring assignment target TSAsExpression

error.todo-rust-as-expression-assignment-target.ts:2:3
  1 | function Component(props: {obj: {x: unknown}}) {
> 2 |   (props.obj.x as unknown as number) = 1;
    |    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ [FindContextIdentifiers] Cannot handle Object destructuring assignment target TSAsExpression
  3 |   return <div>{props.obj.x as number}</div>;
  4 | }
  5 |
```
          
      