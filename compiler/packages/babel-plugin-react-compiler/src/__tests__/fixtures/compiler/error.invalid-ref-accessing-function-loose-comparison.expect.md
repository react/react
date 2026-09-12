
## Input

```javascript
// @validateRefAccessDuringRender
import {useRef} from 'react';

function Component({previous}) {
  const ref = useRef(0);
  const callback = () => ++ref.current;
  return [callback == previous, previous != callback];
}

```


## Error

```
Found 2 errors:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-accessing-function-loose-comparison.ts:7:10
  5 |   const ref = useRef(0);
  6 |   const callback = () => ++ref.current;
> 7 |   return [callback == previous, previous != callback];
    |           ^^^^^^^^ Cannot access ref value during render
  8 | }
  9 |

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-accessing-function-loose-comparison.ts:7:44
  5 |   const ref = useRef(0);
  6 |   const callback = () => ++ref.current;
> 7 |   return [callback == previous, previous != callback];
    |                                             ^^^^^^^^ Cannot access ref value during render
  8 | }
  9 |
```
          
      