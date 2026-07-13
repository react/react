// @validateExhaustiveMemoizationDependencies

import {useMemo} from 'react';
import {makeObject_Primitives} from 'shared-runtime';

function useHook() {
  const object = makeObject_Primitives();
  const fn = useCallback(() => {
    const g = () => {
      return [object];
    };
    return g;
  });
  return fn;
}
