// @flow @validatePreserveExistingMemoizationGuarantees
import {identity} from 'shared-runtime';

component Component(disableLocalRef, ref) {
  const localRef = useFooRef();
  const mergedRef = useMemo(() => {
    return disableLocalRef ? ref : identity(ref, localRef);
  }, [disableLocalRef, ref, localRef]);
  return <div ref={mergedRef} />;
}
