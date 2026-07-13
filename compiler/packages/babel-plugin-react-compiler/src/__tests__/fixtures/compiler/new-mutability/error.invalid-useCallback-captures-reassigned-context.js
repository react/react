// @validatePreserveExistingMemoizationGuarantees @enableNewMutationAliasingModel @enablePreserveExistingMemoizationGuarantees:false
import {useCallback} from 'react';
import {makeArray} from 'shared-runtime';

// This case is already unsound in source, so we can safely bailout
function Foo(props) {
  let x = [];
  x.push(props);

  // makeArray() is captured, but depsList contains [props]
  const cb = useCallback(() => [x], [x]);

  x = makeArray();

  return cb;
}
export const FIXTURE_ENTRYPOINT = {
  fn: Foo,
  params: [{}],
};
