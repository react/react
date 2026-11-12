// @validateRefAccessDuringRender
import {useRef} from 'react';

function Component({initial, reset}) {
  const cache = useRef(null);
  cache.current ??= reset ? (cache.current = {id: initial}) : {id: initial};
  return cache;
}
