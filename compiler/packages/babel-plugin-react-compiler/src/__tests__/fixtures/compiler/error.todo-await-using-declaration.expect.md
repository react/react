
## Input

```javascript
async function Component(props) {
  await using resource = getResource(props.id);
  return <div>{resource.data}</div>;
}

```


## Error

```
Found 1 error:

Todo: (BuildHIR::lowerStatement) Handle await using kinds in VariableDeclaration

error.todo-await-using-declaration.ts:2:2
  1 | async function Component(props) {
> 2 |   await using resource = getResource(props.id);
    |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ (BuildHIR::lowerStatement) Handle await using kinds in VariableDeclaration
  3 |   return <div>{resource.data}</div>;
  4 | }
  5 |
```
          
      