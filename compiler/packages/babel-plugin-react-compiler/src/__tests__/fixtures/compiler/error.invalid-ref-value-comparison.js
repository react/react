// @validateRefAccessDuringRender
import {useRef} from 'react';

function Component({previous, choose}) {
  const ref = useRef(null);
  const callback = () => {};
  const alias = ref.current;
  const selected = choose ? callback : alias;

  return [
    ref.current === previous,
    previous !== ref.current,
    alias !== previous,
    previous === alias,
    selected === previous,
    previous !== selected,
  ];
}
