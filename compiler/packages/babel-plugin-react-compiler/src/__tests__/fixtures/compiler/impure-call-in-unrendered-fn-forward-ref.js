// @validateNoImpureFunctionsInRender
import {useState} from 'react';

function Poll() {
  const [state, setState] = useState('idle');
  const arm = () => {
    setState(String(Date.now()));
    later();
  };
  const later = () => {
    setState('done');
  };
  return (
    <button type="button" onClick={arm}>
      {state}
    </button>
  );
}
