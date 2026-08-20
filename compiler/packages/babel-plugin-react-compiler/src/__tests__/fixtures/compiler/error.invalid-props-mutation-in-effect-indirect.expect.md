
## Input

```javascript
function Component(props) {
  const mutateProps = () => {
    props.value = true;
  };
  const indirectMutateProps = () => {
    mutateProps();
  };
  useEffect(() => indirectMutateProps(), []);
}

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying component props or hook arguments is not allowed. Consider using a local variable instead.

error.invalid-props-mutation-in-effect-indirect.ts:3:4
  1 | function Component(props) {
  2 |   const mutateProps = () => {
> 3 |     props.value = true;
    |     ^^^^^ `props` cannot be modified
  4 |   };
  5 |   const indirectMutateProps = () => {
  6 |     mutateProps();
```
          
      