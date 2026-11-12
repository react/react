
## Input

```javascript
// @validateRefAccessDuringRender
/**
 * Fault tolerance test: three independent errors should all be reported.
 *
 * Error 1 (BuildHIR): `try/finally` is not supported
 * Error 2 (ValidateNoRefAccessInRender): reading ref.current during render
 * Error 3 (InferMutationAliasingEffects): Mutation of frozen props
 */
function Component(props) {
  const ref = useRef(null);

  // Error: try/finally (Todo from BuildHIR)
  try {
    doWork();
  } finally {
    cleanup();
  }

  // Error: reading ref during render
  const value = ref.current;

  // Error: mutating frozen props
  props.items = [];

  return <div>{value}</div>;
}

```


## Error

```
Found 3 errors:

Todo: (BuildHIR::lowerStatement) Handle TryStatement without a catch clause

error.try-finally-ref-access-and-mutation.ts:13:2
  11 |
  12 |   // Error: try/finally (Todo from BuildHIR)
> 13 |   try {
     |   ^^^^^
> 14 |     doWork();
     | ^^^^^^^^^^^^^
> 15 |   } finally {
     | ^^^^^^^^^^^^^
> 16 |     cleanup();
     | ^^^^^^^^^^^^^
> 17 |   }
     | ^^^^ (BuildHIR::lowerStatement) Handle TryStatement without a catch clause
  18 |
  19 |   // Error: reading ref during render
  20 |   const value = ref.current;

Error: This value cannot be modified

Modifying component props or hook arguments is not allowed. Consider using a local variable instead.

error.try-finally-ref-access-and-mutation.ts:23:2
  21 |
  22 |   // Error: mutating frozen props
> 23 |   props.items = [];
     |   ^^^^^ value cannot be modified
  24 |
  25 |   return <div>{value}</div>;
  26 | }

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.try-finally-ref-access-and-mutation.ts:20:16
  18 |
  19 |   // Error: reading ref during render
> 20 |   const value = ref.current;
     |                 ^^^^^^^^^^^ Cannot access ref value during render
  21 |
  22 |   // Error: mutating frozen props
  23 |   props.items = [];
```
          
      