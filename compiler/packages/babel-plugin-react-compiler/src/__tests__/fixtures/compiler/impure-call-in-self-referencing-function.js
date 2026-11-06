// @validateNoImpureFunctionsInRender
import {useState} from 'react';

function Component() {
  const [state, setState] = useState('idle');
  const tick = () => {
    setState(String(Date.now()));
    setTimeout(tick, 1000);
  };
  return <button onClick={tick}>{state}</button>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
