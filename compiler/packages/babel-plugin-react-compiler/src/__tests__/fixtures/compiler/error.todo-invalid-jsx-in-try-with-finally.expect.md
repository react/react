
## Input

```javascript
// @validateNoJSXInTryStatements @outputMode:"lint"
function Component(props) {
  let el;
  try {
    el = <div />;
  } finally {
    console.log(el);
  }
  return el;
}

```


## Error

```
Found 1 error:

Todo: (BuildHIR::lowerStatement) Handle TryStatement without a catch clause

error.todo-invalid-jsx-in-try-with-finally.ts:4:2
   2 | function Component(props) {
   3 |   let el;
>  4 |   try {
     |   ^^^^^
>  5 |     el = <div />;
     | ^^^^^^^^^^^^^^^^^
>  6 |   } finally {
     | ^^^^^^^^^^^^^^^^^
>  7 |     console.log(el);
     | ^^^^^^^^^^^^^^^^^
>  8 |   }
     | ^^^^ (BuildHIR::lowerStatement) Handle TryStatement without a catch clause
   9 |   return el;
  10 | }
  11 |
```
          
      