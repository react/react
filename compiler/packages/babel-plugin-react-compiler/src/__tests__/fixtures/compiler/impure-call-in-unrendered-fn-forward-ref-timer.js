// @validateNoImpureFunctionsInRender
import {useState} from 'react';

function Poll() {
  const [state, setState] = useState('idle');
  const arm = () => {
    setTimeout(tick, 1000);
  };
  const tick = () => {
    setState(String(Date.now()));
    arm();
  };
  return (
    <button type="button" onClick={arm}>
      {state}
    </button>
  );
}
