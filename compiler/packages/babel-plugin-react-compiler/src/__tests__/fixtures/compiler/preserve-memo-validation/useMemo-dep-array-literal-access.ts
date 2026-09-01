// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false

import {useMemo} from 'react';
import {makeArray} from 'shared-runtime';

// We currently only recognize "hoistable" values (e.g. variable reads
// and property loads from named variables) in the source depslist.
// This makes validation logic simpler and follows the same constraints
// from the eslint react-hooks-deps plugin.
function Foo(props) {
  const x = makeArray(props);
  // react-hooks-deps lint would already fail here
  return useMemo(() => [x[0]], [x[0]]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{val: 1}],
};
