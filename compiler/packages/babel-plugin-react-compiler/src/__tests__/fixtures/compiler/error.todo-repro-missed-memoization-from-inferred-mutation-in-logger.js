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
