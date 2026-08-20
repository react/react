// @validatePreserveExistingMemoizationGuarantees
import {useMemo} from 'react';

function Component({propA, propB}) {
  return useMemo(() => {
    return {
      value: propB?.x.y,
      other: propA,
    };
  }, [propA, propB.x.y]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{propA: 2, propB: {x: {y: []}}}],
};
