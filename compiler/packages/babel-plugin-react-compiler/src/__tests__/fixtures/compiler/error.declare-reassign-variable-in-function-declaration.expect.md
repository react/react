
## Input

```javascript
function Component() {
  let x = null;
  function foo() {
    x = 9;
  }
  const y = bar(foo);
  return <Child y={y} />;
}

```


## Error

```
Found 1 error:

Error: Cannot reassign variable after render completes

Reassigning `x` after render has completed can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.declare-reassign-variable-in-function-declaration.ts:4:4
  2 |   let x = null;
  3 |   function foo() {
> 4 |     x = 9;
    |     ^ Cannot reassign `x` after render completes
  5 |   }
  6 |   const y = bar(foo);
  7 |   return <Child y={y} />;
```
          
      