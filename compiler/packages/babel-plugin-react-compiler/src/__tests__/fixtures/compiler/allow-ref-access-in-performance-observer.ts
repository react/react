// @validateRefAccessDuringRender
import {useRef} from 'react';

function usePerformanceLogger() {
  const ref = useRef(null);
  return new PerformanceObserver(() => {
    ref.current = performance.now();
  });
}
