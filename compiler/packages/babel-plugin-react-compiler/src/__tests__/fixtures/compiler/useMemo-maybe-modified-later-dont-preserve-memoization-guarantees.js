// @enablePreserveExistingMemoizationGuarantees:false
import {useMemo} from 'react';
import {identity, makeObject_Primitives, mutate} from 'shared-runtime';

function Component(props) {
  const object = useMemo(() => makeObject_Primitives(), []);
  identity(object);
  return object;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
