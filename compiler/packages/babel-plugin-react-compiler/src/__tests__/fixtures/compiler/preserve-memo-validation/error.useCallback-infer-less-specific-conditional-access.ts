// @validatePreserveExistingMemoizationGuarantees @enablePreserveExistingMemoizationGuarantees:false
import {useCallback} from 'react';
import {mutate} from 'shared-runtime';

function Component({propA, propB}) {
  return useCallback(() => {
    const x = {};
    if (propA?.a) {
      mutate(x);
      return {
        value: propB.x.y,
      };
    }
  }, [propA?.a, propB.x.y]);
}
