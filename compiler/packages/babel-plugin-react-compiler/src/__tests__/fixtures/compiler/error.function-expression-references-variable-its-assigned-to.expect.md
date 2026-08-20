
## Input

```javascript
function Component() {
  let callback = () => {
    callback = null;
  };
  return <div onClick={callback} />;
}

```


## Error

```
Found 1 error:

Error: Cannot reassign variable after render completes

Reassigning `callback` after render has completed can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.function-expression-references-variable-its-assigned-to.ts:3:4
  1 | function Component() {
  2 |   let callback = () => {
> 3 |     callback = null;
    |     ^^^^^^^^ Cannot reassign `callback` after render completes
  4 |   };
  5 |   return <div onClick={callback} />;
  6 | }
```
          
      