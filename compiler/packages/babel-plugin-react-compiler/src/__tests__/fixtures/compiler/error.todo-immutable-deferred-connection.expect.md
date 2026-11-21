
## Input

```javascript
function Component(options) {
  const connection = options.connection;
  return {
    read: () => connection,
    open: () => (connection ??= options.connect()),
  };
}

```


## Error

```
Found 1 error:

Todo: Logical assignment to a `const` variable is not supported

error.todo-immutable-deferred-connection.ts:5:17
  3 |   return {
  4 |     read: () => connection,
> 5 |     open: () => (connection ??= options.connect()),
    |                  ^^^^^^^^^^ Logical assignment to a `const` variable is not supported
  6 |   };
  7 | }
  8 |
```
          
      