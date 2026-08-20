
## Input

```javascript
//@flow
import {useRef} from 'react';

const DEFAULT_VALUE = 1;

component C() {
  const r = useRef(DEFAULT_VALUE);
  if (r.current == DEFAULT_VALUE) {
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

   6 | component C() {
   7 |   const r = useRef(DEFAULT_VALUE);
>  8 |   if (r.current == DEFAULT_VALUE) {
     |       ^^^^^^^^^ Cannot access ref value during render
   9 |     r.current = 1;
  10 |   }
  11 | }

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

   7 |   const r = useRef(DEFAULT_VALUE);
   8 |   if (r.current == DEFAULT_VALUE) {
>  9 |     r.current = 1;
     |     ^^^^^^^^^ Cannot update ref during render
  10 |   }
  11 | }
  12 |
```
          
      