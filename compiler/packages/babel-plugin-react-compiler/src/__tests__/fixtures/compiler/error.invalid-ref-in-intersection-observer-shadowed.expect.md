
## Input

```javascript
// @validateRefAccessDuringRender
import {useRef} from 'react';

function useObserver(IntersectionObserver) {
  const ref = useRef(null);
  return new IntersectionObserver(() => ref.current);
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-in-intersection-observer-shadowed.ts:6:34
  4 | function useObserver(IntersectionObserver) {
  5 |   const ref = useRef(null);
> 6 |   return new IntersectionObserver(() => ref.current);
    |                                   ^^^^^^^^^^^^^^^^^ Passing a ref to a function may read its value during render
  7 | }
  8 |
```
          
      