
## Input

```javascript
import {useEffect, useRef} from 'react';

function Component(props) {
  const ref = useRef();
  useEffect(() => {}, [ref.current]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};

```


## Error

```
Found 2 errors:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.hook-ref-value.ts:5:23
  3 | function Component(props) {
  4 |   const ref = useRef();
> 5 |   useEffect(() => {}, [ref.current]);
    |                        ^^^^^^^^^^^ Cannot access ref value during render
  6 | }
  7 |
  8 | export const FIXTURE_ENTRYPOINT = {

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.hook-ref-value.ts:5:23
  3 | function Component(props) {
  4 |   const ref = useRef();
> 5 |   useEffect(() => {}, [ref.current]);
    |                        ^^^^^^^^^^^ Cannot access ref value during render
  6 | }
  7 |
  8 | export const FIXTURE_ENTRYPOINT = {
```
          
      