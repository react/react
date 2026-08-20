
## Input

```javascript
import {makeArray as useArray} from 'other';

function Component(props) {
  let data;
  if (props.cond) {
    data = useArray();
  }
  return data;
}

```


## Error

```
Found 1 error:

Error: Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)

error.invalid-conditional-call-non-hook-imported-as-hook.ts:6:11
  4 |   let data;
  5 |   if (props.cond) {
> 6 |     data = useArray();
    |            ^^^^^^^^ Hooks must always be called in a consistent order, and may not be called conditionally. See the Rules of Hooks (https://react.dev/warnings/invalid-hook-call-warning)
  7 |   }
  8 |   return data;
  9 | }
```
          
      