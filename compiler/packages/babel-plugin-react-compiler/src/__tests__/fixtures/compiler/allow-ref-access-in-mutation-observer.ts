// @validateRefAccessDuringRender
import {useRef} from 'react';

function useObserver() {
  const ref = useRef(null);
  return new MutationObserver(() => ref.current);
}
