
## Input

```javascript
function Component({value}) {
  const object = {
    get value() {
      return value;
    },
  };
  return <div>{object.value}</div>;
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

Todo: (BuildHIR::lowerExpression) Handle get functions in ObjectExpression

error.todo-object-expression-get-syntax.ts:3:4
  1 | function Component({value}) {
  2 |   const object = {
> 3 |     get value() {
    |     ^^^^^^^^^^^^^
> 4 |       return value;
    | ^^^^^^^^^^^^^^^^^^^
> 5 |     },
    | ^^^^^^ (BuildHIR::lowerExpression) Handle get functions in ObjectExpression
  6 |   };
  7 |   return <div>{object.value}</div>;
  8 | }
```
          
      