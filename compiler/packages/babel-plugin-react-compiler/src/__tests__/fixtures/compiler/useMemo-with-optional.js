// @enablePreserveExistingMemoizationGuarantees:false @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';
function Component(props) {
  return (
    useMemo(() => {
      return [props.value];
    }) || []
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 1}],
};
