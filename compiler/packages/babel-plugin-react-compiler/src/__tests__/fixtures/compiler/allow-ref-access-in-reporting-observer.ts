// @validateRefAccessDuringRender
import {useRef} from 'react';

function useReportLogger() {
  const ref = useRef(null);
  return new ReportingObserver(
    () => {
      ref.current = performance.now();
    },
    {buffered: true},
  );
}
