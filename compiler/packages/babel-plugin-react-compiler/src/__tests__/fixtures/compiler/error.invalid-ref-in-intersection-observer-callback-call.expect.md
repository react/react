
## Input

```javascript
// @validateRefAccessDuringRender
import {useRef} from 'react';

function useIntersectionObserver() {
  const ref = useRef(null);
  const callback = () => ref.current;
  return new IntersectionObserver(callback());
}

```


## Error

```
Found 2 errors:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-in-intersection-observer-callback-call.ts:7:34
  5 |   const ref = useRef(null);
  6 |   const callback = () => ref.current;
> 7 |   return new IntersectionObserver(callback());
    |                                   ^^^^^^^^ This function accesses a ref value
  8 | }
  9 |

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-in-intersection-observer-callback-call.ts:7:34
  5 |   const ref = useRef(null);
  6 |   const callback = () => ref.current;
> 7 |   return new IntersectionObserver(callback());
    |                                   ^^^^^^^^^^ Cannot access ref value during render
  8 | }
  9 |
```
          
      