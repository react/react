// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false
import {useCallback} from 'react';

function Component({propA}) {
  return useCallback(() => {
    return propA.x();
  }, [propA.x]);
}
