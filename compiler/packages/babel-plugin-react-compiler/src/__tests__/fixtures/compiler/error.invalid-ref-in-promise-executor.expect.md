
## Input

```javascript
// @validateRefAccessDuringRender
import {useRef} from 'react';

function usePromise() {
  const ref = useRef(null);
  return new Promise(resolve => resolve(ref.current));
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-in-promise-executor.ts:6:21
  4 | function usePromise() {
  5 |   const ref = useRef(null);
> 6 |   return new Promise(resolve => resolve(ref.current));
    |                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Passing a ref to a function may read its value during render
  7 | }
  8 |
```
          
      