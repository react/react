
## Input

```javascript
// @validateRefAccessDuringRender
/**
 * Fault tolerance test: two independent errors should both be reported.
 *
 * Error 1 (BuildHIR): `var` declarations are not supported (treated as `let`)
 * Error 2 (ValidateNoRefAccessInRender): reading ref.current during render
 */
function Component() {
  const ref = useRef(null);

  // Error: var declaration (Todo from BuildHIR)
  var items = [1, 2, 3];

  // Error: reading ref during render
  const value = ref.current;

  return (
    <div>
      {value}
      {items.length}
    </div>
  );
}

```


## Error

```
Found 2 errors:

Todo: (BuildHIR::lowerStatement) Handle var kinds in VariableDeclaration

error.var-declaration-and-ref-access.ts:12:2
  10 |
  11 |   // Error: var declaration (Todo from BuildHIR)
> 12 |   var items = [1, 2, 3];
     |   ^^^^^^^^^^^^^^^^^^^^^^ (BuildHIR::lowerStatement) Handle var kinds in VariableDeclaration
  13 |
  14 |   // Error: reading ref during render
  15 |   const value = ref.current;

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.var-declaration-and-ref-access.ts:15:16
  13 |
  14 |   // Error: reading ref during render
> 15 |   const value = ref.current;
     |                 ^^^^^^^^^^^ Cannot access ref value during render
  16 |
  17 |   return (
  18 |     <div>
```
          
      