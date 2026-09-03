
## Input

```javascript
import {useCallback, useRef} from 'react';

export default function useThunkDispatch(state, dispatch, extraArg) {
  const stateRef = useRef(state);
  stateRef.current = state;

  return useCallback(
    function thunk(action) {
      if (typeof action === 'function') {
        return action(thunk, () => stateRef.current, extraArg);
      } else {
        dispatch(action);
        return undefined;
      }
    },
    [dispatch, extraArg]
  );
}

```


## Error

```
Found 1 error:

Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be accessed outside of render, such as in event handlers or effects. Accessing a ref value (the `current` property) during render can cause your component not to update as expected (https://react.dev/reference/react/useRef).

error.bug-infer-mutation-aliasing-effects.ts:5:2
  3 | export default function useThunkDispatch(state, dispatch, extraArg) {
  4 |   const stateRef = useRef(state);
> 5 |   stateRef.current = state;
    |   ^^^^^^^^^^^^^^^^ Cannot update ref during render
  6 |
  7 |   return useCallback(
  8 |     function thunk(action) {
```
          
      