import {useMemo} from 'react';

function Component() {
  const entries = useMemo(() => [], []);
  return new FinalizationRegistry(() => {
    entries.push(1);
  });
}
