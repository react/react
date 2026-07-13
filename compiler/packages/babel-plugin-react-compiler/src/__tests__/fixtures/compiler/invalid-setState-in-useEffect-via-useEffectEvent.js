// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useEffectEvent, useState} from 'react';

function Component() {
  const [state, setState] = useState(0);
  const effectEvent = useEffectEvent(() => {
    setState(true);
  });
  useEffect(() => {
    effectEvent();
  }, []);
  return state;
}
