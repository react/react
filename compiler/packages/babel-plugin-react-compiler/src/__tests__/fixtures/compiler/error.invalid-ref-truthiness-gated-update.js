// @validateRefAccessDuringRender
import {useRef} from 'react';

function Component({resumed, limit}) {
  const paused = useRef(false);
  const budget = useRef(0);
  paused.current ||= resumed;
  budget.current &&= limit;
  return [paused, budget];
}
