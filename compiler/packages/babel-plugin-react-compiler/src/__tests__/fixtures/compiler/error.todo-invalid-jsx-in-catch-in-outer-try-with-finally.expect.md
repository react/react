
## Input

```javascript
// @validateNoJSXInTryStatements @outputMode:"lint"
import {identity} from 'shared-runtime';

function Component(props) {
  let el;
  try {
    let value;
    try {
      value = identity(props.foo);
    } catch {
      el = <div value={value} />;
    }
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

error.todo-invalid-jsx-in-catch-in-outer-try-with-finally.ts:6:2
   4 | function Component(props) {
   5 |   let el;
>  6 |   try {
     |   ^^^^^
>  7 |     let value;
     | ^^^^^^^^^^^^^^
>  8 |     try {
     | ^^^^^^^^^^^^^^
>  9 |       value = identity(props.foo);
     | ^^^^^^^^^^^^^^
> 10 |     } catch {
     | ^^^^^^^^^^^^^^
> 11 |       el = <div value={value} />;
     | ^^^^^^^^^^^^^^
> 12 |     }
     | ^^^^^^^^^^^^^^
> 13 |   } finally {
     | ^^^^^^^^^^^^^^
> 14 |     console.log(el);
     | ^^^^^^^^^^^^^^
> 15 |   }
     | ^^^^ (BuildHIR::lowerStatement) Handle TryStatement without a catch clause
  16 |   return el;
  17 | }
  18 |
```
          
      