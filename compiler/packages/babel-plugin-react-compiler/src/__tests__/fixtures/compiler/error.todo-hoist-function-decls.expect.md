
## Input

```javascript
function Component() {
  return get2();
  function get2() {
    return 2;
  }
}

```


## Error

```
Found 1 error:

Todo: Support functions with unreachable code that may contain hoisted declarations

error.todo-hoist-function-decls.ts:3:2
  1 | function Component() {
  2 |   return get2();
> 3 |   function get2() {
    |   ^^^^^^^^^^^^^^^^^
> 4 |     return 2;
    | ^^^^^^^^^^^^^
> 5 |   }
    | ^^^^ Support functions with unreachable code that may contain hoisted declarations
  6 | }
  7 |
```
          
      