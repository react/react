import {useMemo} from 'react';

function Component() {
  const entries = useMemo(() => [], []);
  return new PerformanceObserver(() => {
    entries.push(1);
  });
}
