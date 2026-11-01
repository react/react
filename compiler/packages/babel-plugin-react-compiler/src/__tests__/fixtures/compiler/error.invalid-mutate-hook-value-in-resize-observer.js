import {useMemo} from 'react';

function Component() {
  const items = useMemo(() => [], []);
  return new ResizeObserver(() => {
    items.push(1);
  });
}
