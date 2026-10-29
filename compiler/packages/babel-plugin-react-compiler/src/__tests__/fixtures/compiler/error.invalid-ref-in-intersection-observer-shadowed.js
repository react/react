// @validateRefAccessDuringRender
import {useRef} from 'react';

function useObserver(IntersectionObserver) {
  const ref = useRef(null);
  return new IntersectionObserver(() => ref.current);
}
