// @validateNoImpureFunctionsInRender
import {useState} from 'react';

function Component() {
  const [state, setState] = useState('idle');
  const arm = () => {
    setTimeout(tick, 1000);
  };
  const tick = () => {
    setState(String(Date.now()));
    arm();
  };
  return <button onClick={arm}>{state}</button>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
