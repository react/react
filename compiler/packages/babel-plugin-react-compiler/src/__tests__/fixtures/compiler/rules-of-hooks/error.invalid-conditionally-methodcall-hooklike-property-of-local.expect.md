
## Input

```javascript
import {makeObject_Primitives} from 'shared-runtime';

function Component(props) {
  const local = makeObject_Primitives();
  if (props.cond) {
    local.useFoo();
  }
}

```


## Error

```
Found 1 error:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-conditionally-methodcall-hooklike-property-of-local.ts:6:4
  4 |   const local = makeObject_Primitives();
  5 |   if (props.cond) {
> 6 |     local.useFoo();
    |     ^^^^^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  7 |   }
  8 | }
  9 |
```
          
      