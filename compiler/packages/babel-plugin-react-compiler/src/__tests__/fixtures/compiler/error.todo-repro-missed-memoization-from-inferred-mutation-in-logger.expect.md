
## Input

```javascript
// @flow @validatePreserveExistingMemoizationGuarantees @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useFragment} from 'react-relay';
import LogEvent from 'LogEvent';
import {useCallback, useMemo} from 'react';

component Component(id) {
  const items = useFragment();

  const [index, setIndex] = useState(0);

  const logData = useMemo(() => {
    const item = items[index];
    return {
      key: item.key,
    };
  }, [index, items]);

  const setCurrentIndex = useCallback(
    (index: number) => {
      const object = {
        tracking: logData.key,
      };
      // We infer that this may mutate `object`, which in turn aliases
      // data from `logData`, such that `logData` may be mutated.
      LogEvent.log(() => object);
      setIndex(index);
    },
    [index, logData, items]
  );

  if (prevId !== id) {
    setCurrentIndex(0);
  }

  return (
    <Foo
      index={index}
      items={items}
      current={mediaList[index]}
      setCurrentIndex={setCurrentIndex}
    />
  );
}

```


## Error

```
Found 3 errors:

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This value was memoized in source but not in compilation output.

   9 |   const [index, setIndex] = useState(0);
  10 |
> 11 |   const logData = useMemo(() => {
     |                   ^^^^^^^^^^^^^^^
> 12 |     const item = items[index];
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 13 |     return {
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 14 |       key: item.key,
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 15 |     };
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 16 |   }, [index, items]);
     | ^^^^^^^^^^^^^^^^^^^^^ Could not preserve existing memoization
  17 |
  18 |   const setCurrentIndex = useCallback(
  19 |     (index: number) => {

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This dependency may be mutated later, which could cause the value to change unexpectedly.

  26 |       setIndex(index);
  27 |     },
> 28 |     [index, logData, items]
     |             ^^^^^^^ This dependency may be modified later
  29 |   );
  30 |
  31 |   if (prevId !== id) {

Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This value was memoized in source but not in compilation output.

  17 |
  18 |   const setCurrentIndex = useCallback(
> 19 |     (index: number) => {
     |     ^^^^^^^^^^^^^^^^^^^^
> 20 |       const object = {
     | ^^^^^^^^^^^^^^^^^^^^^^
> 21 |         tracking: logData.key,
     | ^^^^^^^^^^^^^^^^^^^^^^
> 22 |       };
     | ^^^^^^^^^^^^^^^^^^^^^^
> 23 |       // We infer that this may mutate `object`, which in turn aliases
     | ^^^^^^^^^^^^^^^^^^^^^^
> 24 |       // data from `logData`, such that `logData` may be mutated.
     | ^^^^^^^^^^^^^^^^^^^^^^
> 25 |       LogEvent.log(() => object);
     | ^^^^^^^^^^^^^^^^^^^^^^
> 26 |       setIndex(index);
     | ^^^^^^^^^^^^^^^^^^^^^^
> 27 |     },
     | ^^^^^^ Could not preserve existing memoization
  28 |     [index, logData, items]
  29 |   );
  30 |
```
          
      