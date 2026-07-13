
## Input

```javascript
function Component() {
  let x;
  const y = useMemo(() => {
    let z;
    x = [];
    z = true;
    return z;
  }, []);
  return [x, y];
}

```


## Error

```
Found 1 error:

Error: useMemo() callbacks may not reassign variables declared outside of the callback

useMemo() callbacks must be pure functions and cannot reassign variables defined outside of the callback function.

error.invalid-reassign-variable-in-usememo.ts:5:4
  3 |   const y = useMemo(() => {
  4 |     let z;
> 5 |     x = [];
    |     ^ Cannot reassign variable
  6 |     z = true;
  7 |     return z;
  8 |   }, []);
```
          
      