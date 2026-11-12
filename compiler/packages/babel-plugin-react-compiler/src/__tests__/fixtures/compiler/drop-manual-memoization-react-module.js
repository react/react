// useMemo imported from 'react' should be detected and dropped.
// The module name matching must handle 'react' correctly.

import {useMemo} from 'react';

function Component({items}) {
  const sorted = useMemo(() => [...items].sort(), [items]);
  return <div>{sorted}</div>;
}

export default Component;
