// @enablePreserveExistingMemoizationGuarantees
import {useMemo} from 'react';
import {identity, makeObject_Primitives, mutate, useHook} from 'shared-runtime';

function Component(props) {
  // With the feature enabled these variables are inferred as frozen as of
  // the useMemo call
  const free = makeObject_Primitives();
  const free2 = makeObject_Primitives();
  const part = free2.part;

  // Thus their mutable range ends prior to this hook call, and both the above
  // values and the useMemo block value can be memoized
  useHook();

  const object = useMemo(() => {
    const x = makeObject_Primitives();
    x.value = props.value;
    mutate(x, free, part);
    return x;
  }, [props.value, free, part]);

  // These calls should be inferred as non-mutating due to the above freeze inference
  identity(free);
  identity(part);

  return object;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};
