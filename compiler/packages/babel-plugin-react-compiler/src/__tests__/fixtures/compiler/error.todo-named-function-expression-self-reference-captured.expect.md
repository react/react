
## Input

```javascript
function Component() {
  const callback = function self() {
    return () => self;
  };
  return callback();
}

```


## Error

```
Found 1 error:

Todo: References to a named function expression from within its own body are not yet supported

error.todo-named-function-expression-self-reference-captured.ts:3:17
  1 | function Component() {
  2 |   const callback = function self() {
> 3 |     return () => self;
    |                  ^^^^ References to a named function expression from within its own body are not yet supported
  4 |   };
  5 |   return callback();
  6 | }
```
          
      