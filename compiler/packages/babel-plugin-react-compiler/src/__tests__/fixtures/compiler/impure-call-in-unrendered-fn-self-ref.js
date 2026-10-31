// @validateNoImpureFunctionsInRender
import {useState} from 'react';

function Poll() {
  const [state, setState] = useState('idle');
  const tick = () => {
    setState(String(Date.now()));
    setTimeout(tick, 1000);
  };
  return (
    <button type="button" onClick={tick}>
      {state}
    </button>
  );
}
