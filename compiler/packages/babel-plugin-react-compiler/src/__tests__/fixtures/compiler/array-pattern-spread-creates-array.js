// @validatePreserveExistingMemoizationGuarantees @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';
import {makeObject_Primitives, ValidateMemoization} from 'shared-runtime';

function Component(props) {
  // Should memoize independently
  const x = useMemo(() => makeObject_Primitives(), []);

  const rest = useMemo(() => {
    const [_, ...rest] = props.array;

    // Should be inferred as Array.proto.push which doesn't mutate input
    rest.push(x);
    return rest;
  });

  return (
    <>
      <ValidateMemoization inputs={[]} output={x} />
      <ValidateMemoization inputs={[props.array]} output={rest} />
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{array: [0, 1, 2]}],
};
