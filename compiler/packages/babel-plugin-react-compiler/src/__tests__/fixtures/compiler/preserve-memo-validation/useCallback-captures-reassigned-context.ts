// @validatePreserveExistingMemoizationGuarantees

import {useCallback} from 'react';
import {makeArray} from 'shared-runtime';

// This case is fine, as all reassignments happen before the useCallback
function Foo(props) {
  let x = [];
  x.push(props);
  x = makeArray();

  const cb = useCallback(() => [x], [x]);

  return cb;
}
export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};
