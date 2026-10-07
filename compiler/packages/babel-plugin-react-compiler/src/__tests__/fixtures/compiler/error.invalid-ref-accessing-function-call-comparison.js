// @validateRefAccessDuringRender
import {useRef} from 'react';

function Component({previous}) {
  const ref = useRef(0);
  const callback = () => ++ref.current;
  return [callback() === previous, previous !== callback()];
}
