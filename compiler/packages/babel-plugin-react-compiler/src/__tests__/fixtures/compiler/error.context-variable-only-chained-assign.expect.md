
## Input

```javascript
import {identity, invoke} from 'shared-runtime';

function foo() {
  let x = 2;
  const fn1 = () => {
    const copy1 = (x = 3);
    return identity(copy1);
  };
  const fn2 = () => {
    const copy2 = (x = 4);
    return [invoke(fn1), copy2, identity(copy2)];
  };
  return invoke(fn2);
}

export const FIXTURE_ENTRYPOINT = {
  fn: foo,
  params: [],
};

```


## Error

```
Found 1 error:

Error: Cannot reassign variable after render completes

Reassigning `x` after render has completed can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.context-variable-only-chained-assign.ts:10:19
   8 |   };
   9 |   const fn2 = () => {
> 10 |     const copy2 = (x = 4);
     |                    ^ Cannot reassign `x` after render completes
  11 |     return [invoke(fn1), copy2, identity(copy2)];
  12 |   };
  13 |   return invoke(fn2);
```
          
      