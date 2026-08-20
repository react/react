
## Input

```javascript
// @flow @validatePreserveExistingMemoizationGuarantees
import {identity} from 'shared-runtime';

component Component(disableLocalRef, ref) {
  const localRef = useFooRef();
  const mergedRef = useMemo(() => {
    return disableLocalRef ? ref : identity(ref, localRef);
  }, [disableLocalRef, ref, localRef]);
  return <div ref={mergedRef} />;
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

   5 |   const localRef = useFooRef();
   6 |   const mergedRef = useMemo(() => {
>  7 |     return disableLocalRef ? ref : identity(ref, localRef);
     |                                             ^^^ Passing a ref to a function may read its value during render
   8 |   }, [disableLocalRef, ref, localRef]);
   9 |   return <div ref={mergedRef} />;
  10 | }
```
          
      