
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

error.todo-named-function-expression-self-reference-reassigned.ts:3:4
  1 | function Component() {
  2 |   return function self() {
> 3 |     self = null;
    |     ^^^^^^^^^^^ References to a named function expression from within its own body are not yet supported
  4 |   };
  5 | }
  6 |
```
          
      