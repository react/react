// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useMemo, useState} from 'react';
import {ValidateMemoization} from 'shared-runtime';

function Component(props) {
  const [state] = useState(0);
  // Test for conflicts with `c` import
  const c = state;
  const _c = c;
  const __c = _c;
  const c1 = __c;
  const $c = c1;
  const array = useMemo(() => [$c], [state]);
  return <ValidateMemoization inputs={[state]} output={array} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
  sequentialRenders: [{}, {}, {}],
};
