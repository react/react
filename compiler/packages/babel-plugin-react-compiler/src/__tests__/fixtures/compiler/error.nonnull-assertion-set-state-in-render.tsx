// @validateNoSetStateInRender
import {useState} from 'react';

function Component() {
  const [state, setState] = useState(0);
  const reset = () => setState(1);
  const assertedReset = reset!;
  assertedReset!();
  return state;
}
