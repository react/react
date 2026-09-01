
## Input

```javascript
//@flow
import {useRef} from 'react';

component C() {
  const r = useRef(null);
  if (!r.current) {
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
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

  4 | component C() {
  5 |   const r = useRef(null);
> 6 |   if (!r.current) {
    |        ^^^^^^^^^ Cannot access ref value during render
  7 |     r.current = 1;
  8 |   }
  9 | }

To initialize a ref only once, check that the ref is null with the pattern `if (ref.current == null) { ref.current = ... }`
```
          
      