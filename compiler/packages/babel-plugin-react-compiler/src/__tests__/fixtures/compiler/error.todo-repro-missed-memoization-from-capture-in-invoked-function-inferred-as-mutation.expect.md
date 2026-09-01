
## Input

```javascript
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

```


## Error

```
Found 1 error:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This value was memoized in source but not in compilation output.

  16 |   // We infer that getIsEnabled returns a mutable value, such that
  17 |   // isEnabled is mutable
> 18 |   const isEnabled = useMemo(() => getIsEnabled(), [getIsEnabled]);
     |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Could not preserve existing memoization
  19 |
  20 |   // We then infer getLoggingData as capturing that mutable value,
  21 |   // so any calls to this function are then inferred as extending
```
          
      