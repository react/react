
## Input

```javascript
function Component(props) {
  using resource = getResource(props.id);
  return <div>{resource.data}</div>;
}

```


## Error

```
Found 1 error:

Todo: (BuildHIR::lowerStatement) Handle using kinds in VariableDeclaration

error.todo-using-declaration.ts:2:2
  1 | function Component(props) {
> 2 |   using resource = getResource(props.id);
    |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ (BuildHIR::lowerStatement) Handle using kinds in VariableDeclaration
  3 |   return <div>{resource.data}</div>;
  4 | }
  5 |
```
          
      