// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useState} from 'react';

function Component() {
  const [state, setState] = useState(0);
  const f = () => {
    setState(s => s + 1);
  };
  const g = () => {
    f();
  };
  useEffect(() => {
    g();
  });
  return state;
}
