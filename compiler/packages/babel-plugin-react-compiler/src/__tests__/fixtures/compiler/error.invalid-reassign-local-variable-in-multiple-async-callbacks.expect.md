
## Input

```javascript
function Component() {
  let value: number | undefined;
  const a = async () => {
    value = 1;
  };
  const b = async () => {
    value = 2;
  };
  return <div>{[a, b]}</div>;
}

```


## Error

```
Found 1 error:

Error: Cannot reassign variable in async function

Reassigning a variable in an async function can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.invalid-reassign-local-variable-in-multiple-async-callbacks.ts:4:4
  2 |   let value: number | undefined;
  3 |   const a = async () => {
> 4 |     value = 1;
    |     ^^^^^ Cannot reassign `value`
  5 |   };
  6 |   const b = async () => {
  7 |     value = 2;
```
          
      