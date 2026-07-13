// @validateExhaustiveMemoizationDependencies

import {useMemo} from 'react';
import {makeObject_Primitives} from 'shared-runtime';

function useHook() {
  const object = makeObject_Primitives();
  const array = useMemo(() => [object], []);
  return array;
}
