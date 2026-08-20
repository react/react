
## Input

```javascript
// @flow @enableTreatRefLikeIdentifiersAsRefs @validateRefAccessDuringRender
import {makeObject_Primitives} from 'shared-runtime';

component Example() {
  const fooRef = makeObject_Primitives();
  fooRef.current = true;

  return <Stringify foo={fooRef} />;
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

  4 | component Example() {
  5 |   const fooRef = makeObject_Primitives();
> 6 |   fooRef.current = true;
    |   ^^^^^^^^^^^^^^ Cannot update ref during render
  7 |
  8 |   return <Stringify foo={fooRef} />;
  9 | }
```
          
      