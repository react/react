
## Input

```javascript
import {useRef} from 'react';

function Component() {
  const ref = useRef(null);
  const obj = {ref};
  return <div>{obj.ref.current}</div>;
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-read-ref-current-via-object-property.ts:6:15
  4 |   const ref = useRef(null);
  5 |   const obj = {ref};
> 6 |   return <div>{obj.ref.current}</div>;
    |                ^^^^^^^^^^^^^^^ Cannot access ref value during render
  7 | }
  8 |
```
          
      