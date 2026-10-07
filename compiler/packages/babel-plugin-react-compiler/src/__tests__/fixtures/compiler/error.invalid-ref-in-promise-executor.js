// @validateRefAccessDuringRender
import {useRef} from 'react';

function usePromise() {
  const ref = useRef(null);
  return new Promise(resolve => resolve(ref.current));
}
