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
