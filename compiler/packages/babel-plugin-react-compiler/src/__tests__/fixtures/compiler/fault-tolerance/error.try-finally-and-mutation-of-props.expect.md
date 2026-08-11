
## Input

```javascript
/**
 * Fault tolerance test: two independent errors should both be reported.
 *
 * Error 1 (BuildHIR): `try/finally` is not supported
 * Error 2 (InferMutationAliasingEffects): Mutation of frozen props
 */
function Component(props) {
  // Error: try/finally (Todo from BuildHIR)
  try {
    doWork();
  } finally {
    doCleanup();
  }

  // Error: mutating frozen props
  props.value = 1;

  return <div>{props.value}</div>;
}

```


## Error

```
Found 2 errors:

Todo: (BuildHIR::lowerStatement) Handle TryStatement without a catch clause

error.try-finally-and-mutation-of-props.ts:9:2
   7 | function Component(props) {
   8 |   // Error: try/finally (Todo from BuildHIR)
>  9 |   try {
     |   ^^^^^
> 10 |     doWork();
     | ^^^^^^^^^^^^^
> 11 |   } finally {
     | ^^^^^^^^^^^^^
> 12 |     doCleanup();
     | ^^^^^^^^^^^^^
> 13 |   }
     | ^^^^ (BuildHIR::lowerStatement) Handle TryStatement without a catch clause
  14 |
  15 |   // Error: mutating frozen props
  16 |   props.value = 1;

Error: This value cannot be modified

Modifying component props or hook arguments is not allowed. Consider using a local variable instead.

error.try-finally-and-mutation-of-props.ts:16:2
  14 |
  15 |   // Error: mutating frozen props
> 16 |   props.value = 1;
     |   ^^^^^ value cannot be modified
  17 |
  18 |   return <div>{props.value}</div>;
  19 | }
```
          
      