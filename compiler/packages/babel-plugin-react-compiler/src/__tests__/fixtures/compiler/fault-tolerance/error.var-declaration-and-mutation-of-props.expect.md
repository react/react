
## Input

```javascript
/**
 * Fault tolerance test: two independent errors should both be reported.
 *
 * Error 1 (BuildHIR): `var` declarations are not supported (treated as `let`)
 * Error 2 (InferMutationAliasingEffects): Mutation of frozen props
 */
function Component(props) {
  // Error: var declaration (Todo from BuildHIR)
  var items = props.items;

  // Error: mutating frozen props (detected during inference)
  props.items = [];

  return <div>{items.length}</div>;
}

```


## Error

```
Found 2 errors:

Todo: (BuildHIR::lowerStatement) Handle var kinds in VariableDeclaration

error.var-declaration-and-mutation-of-props.ts:9:2
   7 | function Component(props) {
   8 |   // Error: var declaration (Todo from BuildHIR)
>  9 |   var items = props.items;
     |   ^^^^^^^^^^^^^^^^^^^^^^^^ (BuildHIR::lowerStatement) Handle var kinds in VariableDeclaration
  10 |
  11 |   // Error: mutating frozen props (detected during inference)
  12 |   props.items = [];

Error: This value cannot be modified

Modifying component props or hook arguments is not allowed. Consider using a local variable instead.

error.var-declaration-and-mutation-of-props.ts:12:2
  10 |
  11 |   // Error: mutating frozen props (detected during inference)
> 12 |   props.items = [];
     |   ^^^^^ value cannot be modified
  13 |
  14 |   return <div>{items.length}</div>;
  15 | }
```
          
      