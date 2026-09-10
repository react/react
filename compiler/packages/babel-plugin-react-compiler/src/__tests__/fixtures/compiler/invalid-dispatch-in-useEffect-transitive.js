// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useReducer} from 'react';

function reducer(state, action) {
  return action.type === 'inc' ? state + 1 : state;
}

function Component() {
  const [state, dispatch] = useReducer(reducer, 0);
  const increment = () => {
    dispatch({type: 'inc'});
  };
  useEffect(() => {
    increment();
  });
  return state;
}
