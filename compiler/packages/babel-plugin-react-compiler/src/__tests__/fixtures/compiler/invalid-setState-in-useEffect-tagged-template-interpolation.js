// @loggerTestOnly @validateNoSetStateInEffects @outputMode:"lint"
import {useEffect, useState} from 'react';

// Bug: tagged template interpolations should not prevent set-state-in-effect validation
function Component({color}) {
  const [state, setState] = useState(0);
  const style = css`color: ${color}`;
  useEffect(() => {
    setState(s => s + 1);
  });
  return style ?? state;
}
