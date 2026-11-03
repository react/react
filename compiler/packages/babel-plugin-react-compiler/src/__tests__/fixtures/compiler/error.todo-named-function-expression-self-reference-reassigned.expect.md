
## Input

```javascript
function Component() {
  return function self() {
    self = null;
  };
}

```


## Error

```
Found 1 error:

Todo: References to a named function expression from within its own body are not yet supported

error.todo-named-function-expression-self-reference-reassigned.ts:2:18
  1 | function Component() {
> 2 |   return function self() {
    |                   ^^^^ References to a named function expression from within its own body are not yet supported
  3 |     self = null;
  4 |   };
  5 | }
```
          
      