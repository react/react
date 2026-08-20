
## Input

```javascript
//@flow
import {useRef} from 'react';

component C() {
  const r = useRef(null);
  const guard = r.current == null;
  if (guard) {
    r.current = 1;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: C,
  params: [{}],
};

```


## Error

```
Found 2 errors:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

  4 | component C() {
  5 |   const r = useRef(null);
> 6 |   const guard = r.current == null;
    |                 ^^^^^^^^^^^^^^^^^ Cannot access ref value during render
  7 |   if (guard) {
  8 |     r.current = 1;
  9 |   }

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

   5 |   const r = useRef(null);
   6 |   const guard = r.current == null;
>  7 |   if (guard) {
     |       ^^^^^ Cannot access ref value during render
   8 |     r.current = 1;
   9 |   }
  10 | }
```
          
      