// @validateRefAccessDuringRender
import {useRef} from 'react';

function useCleanupLogger() {
  const ref = useRef(null);
  return new FinalizationRegistry(() => {
    ref.current = performance.now();
  });
}
