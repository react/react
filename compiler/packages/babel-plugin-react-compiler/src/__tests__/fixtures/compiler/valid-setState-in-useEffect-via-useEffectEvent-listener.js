// @validateNoSetStateInEffects @loggerTestOnly @compilationMode:"infer"
import {useEffect, useEffectEvent, useState} from 'react';

const shouldSetState = false;

function Component() {
  const [state, setState] = useState(0);
  const effectEvent = useEffectEvent(() => {
    setState(10);
  });
  useEffect(() => {
    setTimeout(effectEvent, 10);
  });

  const effectEventWithTimeout = useEffectEvent(() => {
    setTimeout(() => {
      setState(20);
    }, 10);
  });
  useEffect(() => {
    effectEventWithTimeout();
  }, []);
  return state;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
