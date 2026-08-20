
## Input

```javascript
function Component(props) {
  const f = () => {
    props.value = true;
  };
  const g = () => {
    f();
  };
  g();
}

```


## Error

```
Found 1 error:

Error: This value cannot be modified

Modifying component props or hook arguments is not allowed. Consider using a local variable instead.

error.invalid-prop-mutation-indirect.ts:3:4
  1 | function Component(props) {
  2 |   const f = () => {
> 3 |     props.value = true;
    |     ^^^^^ `props` cannot be modified
  4 |   };
  5 |   const g = () => {
  6 |     f();
```
          
      