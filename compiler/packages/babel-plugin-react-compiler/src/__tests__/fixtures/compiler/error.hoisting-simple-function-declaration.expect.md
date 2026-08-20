
## Input

```javascript
function hoisting() {
  function bar() {
    return x;
  }
  return baz(); // OK: FuncDecls are HoistableDeclarations that have both declaration and value hoisting
  function baz() {
    return bar();
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: hoisting,
  params: [],
  isComponent: false,
};

```


## Error

```
Found 1 error:

Todo: Support functions with unreachable code that may contain hoisted declarations

error.hoisting-simple-function-declaration.ts:6:2
   4 |   }
   5 |   return baz(); // OK: FuncDecls are HoistableDeclarations that have both declaration and value hoisting
>  6 |   function baz() {
     |   ^^^^^^^^^^^^^^^^
>  7 |     return bar();
     | ^^^^^^^^^^^^^^^^^
>  8 |   }
     | ^^^^ Support functions with unreachable code that may contain hoisted declarations
   9 | }
  10 |
  11 | export const FIXTURE_ENTRYPOINT = {
```
          
      