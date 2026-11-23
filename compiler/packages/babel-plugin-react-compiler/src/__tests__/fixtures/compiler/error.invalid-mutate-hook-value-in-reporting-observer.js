import {useMemo} from 'react';

function Component() {
  const entries = useMemo(() => [], []);
  return new ReportingObserver(
    () => {
      entries.push(1);
    },
    {buffered: true}
  );
}
