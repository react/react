
## Input

```javascript
import {makeObject_Primitives} from 'shared-runtime';

function Component(props) {
  const local = makeObject_Primitives();
  if (props.cond) {
    const foo = local.useFoo;
    foo();
  }
}

```


## Error

```
Found 1 error:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-condtionally-call-hooklike-property-of-local.ts:7:4
   5 |   if (props.cond) {
   6 |     const foo = local.useFoo;
>  7 |     foo();
     |     ^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
   8 |   }
   9 | }
  10 |
```
          
      