
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

Todo: References to a named function expression from within its own body are not yet supported

error.todo-named-function-expression-self-reference-use-callback.ts:10:22
   8 |     function thunk(action) {
   9 |       if (typeof action === 'function') {
> 10 |         return action(thunk, () => stateRef.current, extraArg);
     |                       ^^^^^ References to a named function expression from within its own body are not yet supported
  11 |       } else {
  12 |         dispatch(action);
  13 |         return undefined;
```
          
      