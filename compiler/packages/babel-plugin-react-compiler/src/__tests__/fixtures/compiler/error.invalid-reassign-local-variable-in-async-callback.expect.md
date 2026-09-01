
## Input

```javascript
function Component() {
  let value = null;
  const reassign = async () => {
    await foo().then(result => {
      // Reassigning a local variable in an async function is *always* mutating
      // after render, so this should error regardless of where this ends up
      // getting called
      value = result;
    });
  };

  const onClick = async () => {
    await reassign();
  };
  return <div onClick={onClick}>Click</div>;
}

```


## Error

```
Found 1 error:

Error: Cannot reassign variable in async function

Reassigning a variable in an async function can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.invalid-reassign-local-variable-in-async-callback.ts:8:6
   6 |       // after render, so this should error regardless of where this ends up
   7 |       // getting called
>  8 |       value = result;
     |       ^^^^^ Cannot reassign `value`
   9 |     });
  10 |   };
  11 |
```
          
      