// @validatePreserveExistingMemoizationGuarantees
import {useCallback} from 'react';
import {sum} from 'shared-runtime';

function Component({propA, propB}) {
  const x = propB.x.y;
  return useCallback(() => {
    return sum(propA.x, x);
  }, [propA.x, x]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{propA: {x: 2}, propB: {x: {y: 3}}}],
};
