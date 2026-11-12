
## Input

```javascript
// Duplicate function declarations are hoisted and the last one wins, so
// `fmt()` returns 'b' in uncompiled JS. The compiler lowers the second
// declaration as a reassignment at its source position, which would make
// `fmt()` return 'a'; bail out instead.
function Component() {
  function fmt() {
    return 'a';
  }
  const x = fmt();
  function fmt() {
    return 'b';
  }
  return <p>{x}</p>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```


## Error

```
Found 1 error:

Todo: (BuildHIR::lowerStatement) Handle function declarations that redeclare a binding referenced earlier in the function

`fmt` is already declared as a function and is referenced before this declaration.

error.todo-function-declaration-redeclared-after-reference.ts:10:2
   8 |   }
   9 |   const x = fmt();
> 10 |   function fmt() {
     |   ^^^^^^^^^^^^^^^^
> 11 |     return 'b';
     | ^^^^^^^^^^^^^^^
> 12 |   }
     | ^^^^ (BuildHIR::lowerStatement) Handle function declarations that redeclare a binding referenced earlier in the function
  13 |   return <p>{x}</p>;
  14 | }
  15 |
```
          
      