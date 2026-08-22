// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useReducer} from 'react';

function reducer(state, action) {
  return action.type === 'inc' ? state + 1 : state;
}

function Component({subscribe}) {
  const [state, dispatch] = useReducer(reducer, 0);
  useEffect(() => {
    // Dispatching from a callback scheduled by the effect is fine, it does
    // not cascade a render from within the effect itself.
    return subscribe(() => {
      dispatch({type: 'inc'});
    });
  }, [subscribe]);
  return state;
}
