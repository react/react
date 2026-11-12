
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
Found 3 errors:

Todo: Support destructuring of context variables

error.todo-reassign-const.ts:3:20
  1 | import {Stringify} from 'shared-runtime';
  2 |
> 3 | function Component({foo}) {
    |                     ^^^
  4 |   let bar = foo.bar;
  5 |   return (
  6 |     <Stringify

Todo: Support destructuring of context variables

error.todo-reassign-const.ts:3:20
  1 | import {Stringify} from 'shared-runtime';
  2 |
> 3 | function Component({foo}) {
    |                     ^^^
  4 |   let bar = foo.bar;
  5 |   return (
  6 |     <Stringify

Error: This value cannot be modified

Modifying component props or hook arguments is not allowed. Consider using a local variable instead.

error.todo-reassign-const.ts:8:8
   6 |     <Stringify
   7 |       handler={() => {
>  8 |         foo = true;
     |         ^^^ `foo` cannot be modified
   9 |       }}
  10 |     />
  11 |   );
```
          
      