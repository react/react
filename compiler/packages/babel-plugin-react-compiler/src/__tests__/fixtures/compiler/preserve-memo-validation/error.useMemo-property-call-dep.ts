// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';

function Component({propA}) {
  return useMemo(() => {
    return propA.x();
  }, [propA.x]);
}
