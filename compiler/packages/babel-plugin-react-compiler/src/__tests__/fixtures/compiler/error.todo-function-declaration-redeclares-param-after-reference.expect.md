
## Input

```javascript
// Function declarations are instantiated at function entry, so `typeof props`
// observes the function (not the parameter) in uncompiled JS. The compiler
// lowers the declaration as a reassignment at its source position, which
// would evaluate `typeof props` to "object"; bail out instead.
function Component(props) {
  const before = typeof props;
  function props() {}
  return <p>{before}</p>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{x: 1}],
};

```


## Error

```
Found 1 error:

Todo: (BuildHIR::lowerStatement) Handle function declarations that redeclare a binding referenced earlier in the function

`props` is already declared as a param and is referenced before this declaration.

error.todo-function-declaration-redeclares-param-after-reference.ts:7:2
   5 | function Component(props) {
   6 |   const before = typeof props;
>  7 |   function props() {}
     |   ^^^^^^^^^^^^^^^^^^^ (BuildHIR::lowerStatement) Handle function declarations that redeclare a binding referenced earlier in the function
   8 |   return <p>{before}</p>;
   9 | }
  10 |
```
          
      