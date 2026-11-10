
## Input

```javascript
// @validateRefAccessDuringRender
import {useRef} from 'react';

function Component({resumed, limit}) {
  const paused = useRef(false);
  const budget = useRef(0);
  paused.current ||= resumed;
  budget.current &&= limit;
  return [paused, budget];
}

```


## Error

```
Found 4 errors:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-truthiness-gated-update.ts:7:2
   5 |   const paused = useRef(false);
   6 |   const budget = useRef(0);
>  7 |   paused.current ||= resumed;
     |   ^^^^^^^^^^^^^^ Cannot access ref value during render
   8 |   budget.current &&= limit;
   9 |   return [paused, budget];
  10 | }

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-truthiness-gated-update.ts:7:2
   5 |   const paused = useRef(false);
   6 |   const budget = useRef(0);
>  7 |   paused.current ||= resumed;
     |   ^^^^^^^^^^^^^^ Cannot update ref during render
   8 |   budget.current &&= limit;
   9 |   return [paused, budget];
  10 | }

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-truthiness-gated-update.ts:8:2
   6 |   const budget = useRef(0);
   7 |   paused.current ||= resumed;
>  8 |   budget.current &&= limit;
     |   ^^^^^^^^^^^^^^ Cannot access ref value during render
   9 |   return [paused, budget];
  10 | }
  11 |

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-truthiness-gated-update.ts:8:2
   6 |   const budget = useRef(0);
   7 |   paused.current ||= resumed;
>  8 |   budget.current &&= limit;
     |   ^^^^^^^^^^^^^^ Cannot update ref during render
   9 |   return [paused, budget];
  10 | }
  11 |
```
          
      