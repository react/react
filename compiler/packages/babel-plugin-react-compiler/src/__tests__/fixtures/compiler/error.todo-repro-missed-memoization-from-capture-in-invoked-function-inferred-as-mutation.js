// @flow @validatePreserveExistingMemoizationGuarantees @enablePreserveExistingMemoizationGuarantees:false
import {useMemo} from 'react';
import {logValue, useFragment, useHook, typedLog} from 'shared-runtime';

component Component() {
  const data = useFragment();

  const getIsEnabled = () => {
    if (data != null) {
      return true;
    } else {
      return {};
    }
  };

  // We infer that getIsEnabled returns a mutable value, such that
  // isEnabled is mutable
  const isEnabled = useMemo(() => getIsEnabled(), [getIsEnabled]);

  // We then infer getLoggingData as capturing that mutable value,
  // so any calls to this function are then inferred as extending
  // the mutable range of isEnabled
  const getLoggingData = () => {
    return {
      isEnabled,
    };
  };

  // The call here is then inferred as an indirect mutation of isEnabled
  useHook(getLoggingData());

  return <div onClick={() => typedLog(getLoggingData())} />;
}
