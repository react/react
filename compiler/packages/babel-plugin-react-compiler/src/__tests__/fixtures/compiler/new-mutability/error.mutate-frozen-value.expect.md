
## Input

```javascript
// @enableNewMutationAliasingModel
function Component({a, b}) {
  const x = {a};
  useFreeze(x);
  x.y = true;
  return <div>error</div>;
}

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying a value previously passed as an argument to a hook is not allowed. Consider moving the modification before calling the hook.

error.mutate-frozen-value.ts:5:2
  3 |   const x = {a};
  4 |   useFreeze(x);
> 5 |   x.y = true;
    |   ^ value cannot be modified
  6 |   return <div>error</div>;
  7 | }
  8 |
```
          
      