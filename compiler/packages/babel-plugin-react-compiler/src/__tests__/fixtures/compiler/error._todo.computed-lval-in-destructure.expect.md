
## Input

```javascript
function Component(props) {
  const computedKey = props.key;
  const {[computedKey]: x} = props.val;

  return x;
}

```


## Error

```
Found 1 error:

Invariant: [InferMutationAliasingEffects] Expected value kind to be initialized

<unknown> x$8.

error._todo.computed-lval-in-destructure.ts:5:9
  3 |   const {[computedKey]: x} = props.val;
  4 |
> 5 |   return x;
    |          ^ this is uninitialized
  6 | }
  7 |
```
          
      