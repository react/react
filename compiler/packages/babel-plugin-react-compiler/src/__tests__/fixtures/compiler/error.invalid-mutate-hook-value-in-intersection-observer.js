import {useMemo} from 'react';

function Component() {
  const items = useMemo(() => [], []);
  return new IntersectionObserver(() => {
    items.push(1);
  });
}
