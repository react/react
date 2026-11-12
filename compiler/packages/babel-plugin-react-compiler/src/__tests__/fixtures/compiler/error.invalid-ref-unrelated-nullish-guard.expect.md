
## Input

```javascript
// @validateRefAccessDuringRender
import {useRef} from 'react';

function Component({status}) {
  const request = useRef(null);
  const response = useRef(null);
  const pending = request;
  pending.current ?? (response['current'] = {status});
  return response;
}

```


## Error

```
Found 2 errors:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-unrelated-nullish-guard.ts:8:2
   6 |   const response = useRef(null);
   7 |   const pending = request;
>  8 |   pending.current ?? (response['current'] = {status});
     |   ^^^^^^^^^^^^^^^ Cannot access ref value during render
   9 |   return response;
  10 | }
  11 |

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-unrelated-nullish-guard.ts:8:22
   6 |   const response = useRef(null);
   7 |   const pending = request;
>  8 |   pending.current ?? (response['current'] = {status});
     |                       ^^^^^^^^^^^^^^^^^^^ Cannot update ref during render
   9 |   return response;
  10 | }
  11 |
```
          
      