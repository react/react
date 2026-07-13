import {arrayPush} from 'shared-runtime';

// @validateExhaustiveMemoizationDependencies
function Component() {
  const item = [];
  const foo = useCallback(
    () => {
      arrayPush(item, 1);
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return <Button foo={foo} />;
}
