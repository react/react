
## Input

```javascript
function Component({count}) {
  const callback = function recur(n) {
    return n === 0 ? 0 : n + recur(n - 1);
  };
  return callback(count);
}

```


## Error

```
Found 1 error:

Todo: References to a named function expression from within its own body are not yet supported

error.todo-named-function-expression-self-reference-recursive.ts:3:29
  1 | function Component({count}) {
  2 |   const callback = function recur(n) {
> 3 |     return n === 0 ? 0 : n + recur(n - 1);
    |                              ^^^^^ References to a named function expression from within its own body are not yet supported
  4 |   };
  5 |   return callback(count);
  6 | }
```
          
      