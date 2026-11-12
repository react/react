// @validateRefAccessDuringRender
import {useRef} from 'react';

function Component({item}) {
  const cache = useRef({entry: null});
  cache.current.entry ?? (cache.current = {entry: item});
  return cache;
}
