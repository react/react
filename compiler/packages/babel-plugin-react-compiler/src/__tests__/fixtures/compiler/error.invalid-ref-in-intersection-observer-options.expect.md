
## Input

```javascript
// @validateRefAccessDuringRender
import {useRef} from 'react';

function useIntersectionObserver() {
  const rootRef = useRef(null);
  return new IntersectionObserver(() => {}, {root: rootRef.current});
}

```


## Error

```
Found 2 errors:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-in-intersection-observer-options.ts:6:51
  4 | function useIntersectionObserver() {
  5 |   const rootRef = useRef(null);
> 6 |   return new IntersectionObserver(() => {}, {root: rootRef.current});
    |                                                    ^^^^^^^^^^^^^^^ Cannot access ref value during render
  7 | }
  8 |

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-in-intersection-observer-options.ts:6:51
  4 | function useIntersectionObserver() {
  5 |   const rootRef = useRef(null);
> 6 |   return new IntersectionObserver(() => {}, {root: rootRef.current});
    |                                                    ^^^^^^^^^^^^^^^ Passing a ref to a function may read its value during render
  7 | }
  8 |
```
          
      