// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';

function useHook(maybeRef, shouldRead) {
  return useMemo(() => {
    return () => [maybeRef.current];
  }, [shouldRead, maybeRef]);
}
