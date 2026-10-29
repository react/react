
## Input

```javascript
function Component(props) {
  let key = null;
  for (key in props.value) {
  }
  return <div>{key}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: {a: 1, b: 2}}],
};

```


## Error

```
Found 1 error:

Todo: (BuildHIR::lowerStatement) Handle Identifier inits in ForInStatement

error.todo-for-in-loop-assigns-existing-variable.ts:3:7
  1 | function Component(props) {
  2 |   let key = null;
> 3 |   for (key in props.value) {
    |        ^^^ (BuildHIR::lowerStatement) Handle Identifier inits in ForInStatement
  4 |   }
  5 |   return <div>{key}</div>;
  6 | }
```
          
      