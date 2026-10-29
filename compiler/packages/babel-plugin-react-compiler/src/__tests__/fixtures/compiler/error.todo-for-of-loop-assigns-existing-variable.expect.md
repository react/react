
## Input

```javascript
function Component(props) {
  let item = null;
  for (item of props.items) {
    if (item.selected) {
      break;
    }
  }
  return <div>{item?.name}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{items: [{name: 'a'}, {name: 'b', selected: true}]}],
};

```


## Error

```
Found 1 error:

Todo: (BuildHIR::lowerStatement) Handle Identifier inits in ForOfStatement

error.todo-for-of-loop-assigns-existing-variable.ts:3:7
  1 | function Component(props) {
  2 |   let item = null;
> 3 |   for (item of props.items) {
    |        ^^^^ (BuildHIR::lowerStatement) Handle Identifier inits in ForOfStatement
  4 |     if (item.selected) {
  5 |       break;
  6 |     }
```
          
      