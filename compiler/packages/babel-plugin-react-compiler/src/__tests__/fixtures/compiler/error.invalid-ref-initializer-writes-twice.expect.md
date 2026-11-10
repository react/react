
## Input

```javascript
// @validateRefAccessDuringRender
import {useRef} from 'react';

function Component({initial, reset}) {
  const cache = useRef(null);
  cache.current ??= reset ? (cache.current = {id: initial}) : {id: initial};
  return cache;
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-initializer-writes-twice.ts:6:2
  4 | function Component({initial, reset}) {
  5 |   const cache = useRef(null);
> 6 |   cache.current ??= reset ? (cache.current = {id: initial}) : {id: initial};
    |   ^^^^^^^^^^^^^ Cannot update ref during render
  7 |   return cache;
  8 | }
  9 |
```
          
      