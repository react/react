
## Input

```javascript
// @enableNewMutationAliasingModel
function Component(props) {
  function hasErrors() {
    let hasErrors = false;
    if (props.items == null) {
      hasErrors = true;
    }
    return hasErrors;
  }
  return hasErrors();
}

```


## Error

```
Found 1 error:

Invariant: [InferMutationAliasingEffects] Expected value kind to be initialized

<unknown> hasErrors_0$15:TFunction.

error.todo-repro-named-function-with-shadowed-local-same-name.ts:10:9
   8 |     return hasErrors;
   9 |   }
> 10 |   return hasErrors();
     |          ^^^^^^^^^ this is uninitialized
  11 | }
  12 |
```
          
      