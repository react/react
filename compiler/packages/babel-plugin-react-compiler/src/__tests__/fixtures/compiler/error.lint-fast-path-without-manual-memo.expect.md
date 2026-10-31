
## Input

```javascript
// @loggerTestOnly @validateRefAccessDuringRender @outputMode:"lint" @enableLintFastPath
import {useRef} from 'react';

/**
 * Functions without manual memoization stop compiling after the last
 * validation pass, and still report validation errors.
 */
function Component(props) {
  const ref = useRef(null);
  const value = ref.current;
  return <div>{value}</div>;
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.lint-fast-path-without-manual-memo.ts:10:16
   8 | function Component(props) {
   9 |   const ref = useRef(null);
> 10 |   const value = ref.current;
     |                 ^^^^^^^^^^^ Cannot access ref value during render
  11 |   return <div>{value}</div>;
  12 | }
  13 |
```
          
      