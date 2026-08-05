
## Input

```javascript
// @flow
function Foo() {
  function hasError() {
    let hasError = false;
    return hasError;
  }
  return <div x={hasError} />;
}

```


## Error

```
Found 1 error:

Invariant: [InferMutationAliasingEffects] Expected value kind to be initialized

<unknown> hasError_0$8.

  5 |     return hasError;
  6 |   }
> 7 |   return <div x={hasError} />;
    |                  ^^^^^^^^ this is uninitialized
  8 | }
  9 |
```
          
      