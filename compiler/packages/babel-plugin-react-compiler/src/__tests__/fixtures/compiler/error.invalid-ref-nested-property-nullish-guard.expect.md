
## Input

```javascript
// @validateRefAccessDuringRender
import {useRef} from 'react';

function Component({item}) {
  const cache = useRef({entry: null});
  cache.current.entry ?? (cache.current = {entry: item});
  return cache;
}

```


## Error

```
Found 2 errors:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-nested-property-nullish-guard.ts:6:2
  4 | function Component({item}) {
  5 |   const cache = useRef({entry: null});
> 6 |   cache.current.entry ?? (cache.current = {entry: item});
    |   ^^^^^^^^^^^^^^^^^^^ Cannot access ref value during render
  7 |   return cache;
  8 | }
  9 |

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-nested-property-nullish-guard.ts:6:26
  4 | function Component({item}) {
  5 |   const cache = useRef({entry: null});
> 6 |   cache.current.entry ?? (cache.current = {entry: item});
    |                           ^^^^^^^^^^^^^ Cannot update ref during render
  7 |   return cache;
  8 | }
  9 |
```
          
      