// @validateRefAccessDuringRender
import {useRef} from 'react';

function useIntersectionObserver() {
  const rootRef = useRef(null);
  return new IntersectionObserver(() => {}, {root: rootRef.current});
}
