// @loggerTestOnly @validatePreserveExistingMemoizationGuarantees @enablePreserveExistingMemoizationGuarantees:false @outputMode:"lint" @enableLintFastPath
import {identity, useHook} from 'shared-runtime';

/**
 * Functions with manual memoization run the full pipeline so that
 * ValidatePreservedManualMemoization can still report errors.
 */
function useInputValue(input) {
  let x = {};
  useHook();
  const object = React.useMemo(() => {
    const {value} = identity(input, x);
    return {value};
  }, [input, x]);
  return object;
}
