// @validateRefAccessDuringRender
import {useRef} from 'react';

function useIntersectionObserver() {
  const ref = useRef(null);
  const callback = () => ref.current;
  return new IntersectionObserver(callback());
}
