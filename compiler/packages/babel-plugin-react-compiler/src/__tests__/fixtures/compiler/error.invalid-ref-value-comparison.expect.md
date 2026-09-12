
## Input

```javascript
// @validateRefAccessDuringRender
import {useRef} from 'react';

function Component({previous, choose}) {
  const ref = useRef(null);
  const callback = () => {};
  const alias = ref.current;
  const selected = choose ? callback : alias;

  return [
    ref.current === previous,
    previous !== ref.current,
    alias !== previous,
    previous === alias,
    selected === previous,
    previous !== selected,
  ];
}

```


## Error

```
Found 6 errors:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-value-comparison.ts:11:4
   9 |
  10 |   return [
> 11 |     ref.current === previous,
     |     ^^^^^^^^^^^ Cannot access ref value during render
  12 |     previous !== ref.current,
  13 |     alias !== previous,
  14 |     previous === alias,

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-value-comparison.ts:12:17
  10 |   return [
  11 |     ref.current === previous,
> 12 |     previous !== ref.current,
     |                  ^^^^^^^^^^^ Cannot access ref value during render
  13 |     alias !== previous,
  14 |     previous === alias,
  15 |     selected === previous,

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-value-comparison.ts:7:16
   5 |   const ref = useRef(null);
   6 |   const callback = () => {};
>  7 |   const alias = ref.current;
     |                 ^^^^^^^^^^^ Cannot access ref value during render
   8 |   const selected = choose ? callback : alias;
   9 |
  10 |   return [

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-value-comparison.ts:7:16
   5 |   const ref = useRef(null);
   6 |   const callback = () => {};
>  7 |   const alias = ref.current;
     |                 ^^^^^^^^^^^ Cannot access ref value during render
   8 |   const selected = choose ? callback : alias;
   9 |
  10 |   return [

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-value-comparison.ts:7:16
   5 |   const ref = useRef(null);
   6 |   const callback = () => {};
>  7 |   const alias = ref.current;
     |                 ^^^^^^^^^^^ Cannot access ref value during render
   8 |   const selected = choose ? callback : alias;
   9 |
  10 |   return [

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.invalid-ref-value-comparison.ts:7:16
   5 |   const ref = useRef(null);
   6 |   const callback = () => {};
>  7 |   const alias = ref.current;
     |                 ^^^^^^^^^^^ Cannot access ref value during render
   8 |   const selected = choose ? callback : alias;
   9 |
  10 |   return [
```
          
      