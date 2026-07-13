// @validateNoSetStateInRender:false @enablePreserveExistingMemoizationGuarantees:false
import {useMemo} from 'react';
import {makeArray} from 'shared-runtime';

function Component() {
  const x = useMemo(makeArray, []);
  return x;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
