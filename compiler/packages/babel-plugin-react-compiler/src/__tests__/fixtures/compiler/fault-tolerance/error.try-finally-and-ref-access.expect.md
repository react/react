
## Input

```javascript
// @validateRefAccessDuringRender
/**
 * Fault tolerance test: two independent errors should both be reported.
 *
 * Error 1 (BuildHIR): `try/finally` is not supported
 * Error 2 (ValidateNoRefAccessInRender): reading ref.current during render
 */
function Component() {
  const ref = useRef(null);

  // Error: try/finally (Todo from BuildHIR)
  try {
    doSomething();
  } finally {
    cleanup();
  }

  // Error: reading ref during render
  const value = ref.current;

  return <div>{value}</div>;
}

```


## Error

```
Found 2 errors:

Todo: (BuildHIR::lowerStatement) Handle TryStatement without a catch clause

error.try-finally-and-ref-access.ts:12:2
  10 |
  11 |   // Error: try/finally (Todo from BuildHIR)
> 12 |   try {
     |   ^^^^^
> 13 |     doSomething();
     | ^^^^^^^^^^^^^^^^^^
> 14 |   } finally {
     | ^^^^^^^^^^^^^^^^^^
> 15 |     cleanup();
     | ^^^^^^^^^^^^^^^^^^
> 16 |   }
     | ^^^^ (BuildHIR::lowerStatement) Handle TryStatement without a catch clause
  17 |
  18 |   // Error: reading ref during render
  19 |   const value = ref.current;

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.try-finally-and-ref-access.ts:19:16
  17 |
  18 |   // Error: reading ref during render
> 19 |   const value = ref.current;
     |                 ^^^^^^^^^^^ Cannot access ref value during render
  20 |
  21 |   return <div>{value}</div>;
  22 | }
```
          
      