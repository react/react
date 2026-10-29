
## Input

```javascript
import {Stringify} from 'shared-runtime';

function Component({foo}) {
  let bar = foo.bar;
  return (
    <Stringify
      handler={() => {
        foo = true;
      }}
    />
  );
}

```


## Error

```
Found 2 errors:

Error: Cannot reassign variable after render completes

Reassigning `foo` after render has completed can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.todo-reassign-const.ts:8:8
   6 |     <Stringify
   7 |       handler={() => {
>  8 |         foo = true;
     |         ^^^ Cannot reassign `foo` after render completes
   9 |       }}
  10 |     />
  11 |   );

Error: Cannot modify local variables after render completes

This argument is a function which may reassign or mutate `foo` after render, which can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.todo-reassign-const.ts:7:15
   5 |   return (
   6 |     <Stringify
>  7 |       handler={() => {
     |                ^^^^^^^
>  8 |         foo = true;
     | ^^^^^^^^^^^^^^^^^^^
>  9 |       }}
     | ^^^^^^^^ This function may (indirectly) reassign or modify `foo` after render
  10 |     />
  11 |   );
  12 | }

error.todo-reassign-const.ts:8:8
   6 |     <Stringify
   7 |       handler={() => {
>  8 |         foo = true;
     |         ^^^ This modifies `foo`
   9 |       }}
  10 |     />
  11 |   );
```
          
      