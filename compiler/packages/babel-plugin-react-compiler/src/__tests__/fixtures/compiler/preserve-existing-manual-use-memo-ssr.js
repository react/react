// @enablePreserveExistingManualUseMemo @outputMode:"ssr"
// In SSR mode, manual memoization is always dropped regardless of the flag.
import {useMemo} from 'react';

function Component({items}) {
  const sorted = useMemo(() => [...items].sort(), [items]);
  return (
    <ul>
      {sorted.map(item => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default Component;
