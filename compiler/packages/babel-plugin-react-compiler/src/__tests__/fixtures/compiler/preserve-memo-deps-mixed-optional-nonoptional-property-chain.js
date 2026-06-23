// @enablePreserveExistingMemoizationGuarantees @validatePreserveExistingMemoizationGuarantees @enableOptionalDependencies

import {useMemo} from 'react';
import {identity} from 'shared-runtime';

function Component({x}) {
  const object = useMemo(() => {
    return identity({
      callback: () => {
        // Dependency inference should preserve the full mixed optional and
        // non-optional property chain.
        return identity(x.a.b?.c.d?.e);
      },
    });
  }, [x.a.b?.c.d?.e]);
  return object.callback();
}
