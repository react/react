// @validateRefAccessDuringRender
import {useRef} from 'react';

function useObserver() {
  const ref = useRef(null);
  return new ResizeObserver(() => ref.current);
}

function useObserverWithOptions(
  target: Element,
  box: ResizeObserverBoxOptions,
) {
  const ref = useRef(null);
  // The options object belongs to `observe`, not to the constructor.
  const observer = new ResizeObserver(() => ref.current);
  observer.observe(target, {box});
  return observer;
}
