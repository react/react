
## Input

```javascript
import {useState as state} from 'react';

function Component(props) {
  let s;
  if (props.cond) {
    [s] = state();
  }
  return s;
}

```


## Error

```
Found 1 error:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-conditional-call-aliased-react-hook.ts:6:10
  4 |   let s;
  5 |   if (props.cond) {
> 6 |     [s] = state();
    |           ^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  7 |   }
  8 |   return s;
  9 | }
```
          
      