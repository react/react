// @validateRefAccessDuringRender
import {useRef} from 'react';

function useObserver() {
  const ref = useRef(null);
  return new IntersectionObserver(() => ref.current);
}

function useObserverWithOptions(options: Partial<IntersectionObserverInit>) {
  const ref = useRef(null);
  return new IntersectionObserver(() => ref.current, options);
}
