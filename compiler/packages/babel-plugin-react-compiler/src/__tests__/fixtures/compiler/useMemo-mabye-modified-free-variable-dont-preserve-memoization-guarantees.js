// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';
import {identity, makeObject_Primitives, mutate, useHook} from 'shared-runtime';

function Component(props) {
  // With the feature disabled these variables are inferred as being mutated inside the useMemo block
  const free = makeObject_Primitives();
  const free2 = makeObject_Primitives();
  const part = free2.part;

  // This causes their range to extend to include this hook call, and in turn for the memoization to be pruned
  useHook();
  const object = useMemo(() => {
    const x = makeObject_Primitives();
    x.value = props.value;
    mutate(x, free, part);
    return x;
  }, [props.value]);

  identity(free);
  identity(part);
  return object;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};
