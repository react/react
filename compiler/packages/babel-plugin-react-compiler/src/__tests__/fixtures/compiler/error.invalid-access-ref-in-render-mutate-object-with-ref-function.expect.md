
## Input

```javascript
import {useRef} from 'react';

function Component() {
  const ref = useRef(null);
  const object = {};
  object.foo = () => ref.current;
  const refValue = object.foo();
  return <div>{refValue}</div>;
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-access-ref-in-render-mutate-object-with-ref-function.ts:7:19
   5 |   const object = {};
   6 |   object.foo = () => ref.current;
>  7 |   const refValue = object.foo();
     |                    ^^^^^^^^^^ This function accesses a ref value
   8 |   return <div>{refValue}</div>;
   9 | }
  10 |
```
          
      