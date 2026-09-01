// @validatePreserveExistingMemoizationGuarantees
import {useCallback} from 'react';

function useHook(maybeRef) {
  return useCallback(() => {
    return [maybeRef.current];
  }, [maybeRef]);
}
