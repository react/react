
## Input

```javascript
import {useFragment as readFragment} from 'shared-runtime';

function Component(props) {
  let data;
  if (props.cond) {
    data = readFragment();
  }
  return data;
}

```


## Error

```
Found 1 error:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-conditional-call-aliased-hook-import.ts:6:11
  4 |   let data;
  5 |   if (props.cond) {
> 6 |     data = readFragment();
    |            ^^^^^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  7 |   }
  8 |   return data;
  9 | }
```
          
      