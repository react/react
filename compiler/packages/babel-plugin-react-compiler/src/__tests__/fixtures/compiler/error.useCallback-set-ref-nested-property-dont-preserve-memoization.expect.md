
## Input

```javascript
// @enablePreserveExistingMemoizationGuarantees:false
import {useCallback, useRef} from 'react';

function Component(props) {
  const ref = useRef({inner: null});

  const onChange = useCallback(event => {
    // The ref should still be mutable here even though function deps are frozen in
    // @enablePreserveExistingMemoizationGuarantees mode
    ref.current.inner = event.target.value;
  });

  ref.current.inner = null;

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

error.useCallback-set-ref-nested-property-dont-preserve-memoization.ts:13:2
  11 |   });
  12 |
> 13 |   ref.current.inner = null;
     |   ^^^^^^^^^^^ Cannot update ref during render
  14 |
  15 |   return <input onChange={onChange} />;
  16 | }
```
          
      