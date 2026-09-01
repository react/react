
## Input

```javascript
function Component(props) {
  let x = cond ? someGlobal : props.foo;
  const mutatePhiThatCouldBeProps = () => {
    x.y = true;
  };
  const indirectMutateProps = () => {
    mutatePhiThatCouldBeProps();
  };
  useEffect(() => indirectMutateProps(), []);
}

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying a variable defined outside a component or hook is not allowed. Consider using an effect.

error.invalid-mutation-of-possible-props-phi-indirect.ts:4:4
  2 |   let x = cond ? someGlobal : props.foo;
  3 |   const mutatePhiThatCouldBeProps = () => {
> 4 |     x.y = true;
    |     ^ `x` cannot be modified
  5 |   };
  6 |   const indirectMutateProps = () => {
  7 |     mutatePhiThatCouldBeProps();
```
          
      