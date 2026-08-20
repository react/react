
## Input

```javascript
function Component(props) {
  let value;
  const object = {
    set value(v) {
      value = v;
    },
  };
  object.value = props.value;
  return <div>{value}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [{value: 0}],
  sequentialRenders: [{value: 1}, {value: 2}],
};

```


## Error

```
Found 1 error:

Todo: (BuildHIR::lowerExpression) Handle set functions in ObjectExpression

error.todo-object-expression-set-syntax.ts:4:4
  2 |   let value;
  3 |   const object = {
> 4 |     set value(v) {
    |     ^^^^^^^^^^^^^^
> 5 |       value = v;
    | ^^^^^^^^^^^^^^^^
> 6 |     },
    | ^^^^^^ (BuildHIR::lowerExpression) Handle set functions in ObjectExpression
  7 |   };
  8 |   object.value = props.value;
  9 |   return <div>{value}</div>;
```
          
      