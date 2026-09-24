
## Input

```javascript
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

```

## Code

```javascript
// @enablePreserveExistingManualUseMemo @outputMode:"ssr"
// In SSR mode, manual memoization is always dropped regardless of the flag.
import { useMemo } from 'react';
function Component(t0) {
  const {
    items
  } = t0;
  const sorted = [...items].sort();
  return <ul>{sorted.map(_temp)}</ul>;
}
function _temp(item) {
  return <li key={item}>{item}</li>;
}
export default Component;

```

### Eval output
(kind: exception) Fixture not implemented
