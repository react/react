// @validatePreserveExistingMemoizationGuarantees
import {useMemo} from 'react';

function Component({propA, propB}) {
  return useMemo(() => {
    if (propA) {
      return {
        value: propB.x.y,
      };
    }
  }, [propA, propB.x.y]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{propA: 1, propB: {x: {y: []}}}],
};
