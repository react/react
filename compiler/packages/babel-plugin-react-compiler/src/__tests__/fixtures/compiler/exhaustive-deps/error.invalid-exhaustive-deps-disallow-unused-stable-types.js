// @validateExhaustiveMemoizationDependencies

import {useState} from 'react';
import {Stringify} from 'shared-runtime';

function Component() {
  const [state, setState] = useState(0);
  const x = useMemo(() => {
    return [state];
    // error: `setState` is a stable type, but not actually referenced
  }, [state, setState]);

  return 'oops';
}
