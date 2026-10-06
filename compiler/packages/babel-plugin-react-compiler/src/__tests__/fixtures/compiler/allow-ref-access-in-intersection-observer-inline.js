// @validateRefAccessDuringRender
import {useRef} from 'react';

function useIntersectionObserver(options) {
  const ref = useRef(false);
  return new IntersectionObserver(entries => {
    ref.current = entries.some(entry => entry.isIntersecting);
  }, options);
}
