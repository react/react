
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees @validateRefAccessDuringRender
import {useCallback, useRef} from 'react';

function Component(props) {
  const ref = useRef({inner: null});

  const onChange = useCallback(event => {
    // The ref should still be mutable here even though function deps are frozen in
    // @enablePreserveExistingMemoizationGuarantees mode
    ref.current.inner = event.target.value;
  });

  // The ref is modified later, extending its range and preventing memoization of onChange
  const reset = () => {
    ref.current.inner = null;
  };
  reset();

  return <input onChange={onChange} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.useCallback-accesses-ref-mutated-later-via-function-preserve-memoization.ts:17:2
  15 |     ref.current.inner = null;
  16 |   };
> 17 |   reset();
     |   ^^^^^ This function accesses a ref value
  18 |
  19 |   return <input onChange={onChange} />;
  20 | }
```
          
      