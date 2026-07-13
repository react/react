// @validatePreserveExistingMemoizationGuarantees @enablePreserveExistingMemoizationGuarantees:false
import {makeObject_Primitives, Stringify} from 'shared-runtime';

function Component(props) {
  const object = {object: props.object};
  const values = useMemo(() => Object.values(object), [object]);
  values.map(value => {
    value.updated = true;
  });
  return <Stringify values={values} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{object: {key: makeObject_Primitives()}}],
};
