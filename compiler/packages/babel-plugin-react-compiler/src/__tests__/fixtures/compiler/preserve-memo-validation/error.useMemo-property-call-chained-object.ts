// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';

function Component({propA}) {
  return useMemo(() => {
    return {
      value: propA.x().y,
    };
  }, [propA.x]);
}
