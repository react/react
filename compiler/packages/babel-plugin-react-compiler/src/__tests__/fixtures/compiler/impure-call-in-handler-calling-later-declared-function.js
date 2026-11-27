// @validateNoImpureFunctionsInRender
import {useState} from 'react';

function Component() {
  const [state, setState] = useState('idle');
  const arm = () => {
    setState(String(Date.now()));
    later();
  };
  const later = () => {
    setState('done');
  };
  return <button onClick={arm}>{state}</button>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
