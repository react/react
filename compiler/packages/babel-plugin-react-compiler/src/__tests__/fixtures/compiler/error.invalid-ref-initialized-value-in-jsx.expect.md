
## Input

```javascript
// @validateRefAccessDuringRender
import {useRef} from 'react';

function Component({fallback}) {
  const snapshot = useRef(null);
  snapshot.current ??= {value: fallback};
  const source = snapshot;
  return <output>{source['current'].value}</output>;
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-initialized-value-in-jsx.ts:8:18
   6 |   snapshot.current ??= {value: fallback};
   7 |   const source = snapshot;
>  8 |   return <output>{source['current'].value}</output>;
     |                   ^^^^^^^^^^^^^^^^^^^^^^^ Cannot access ref value during render
   9 | }
  10 |
```
          
      