// @enablePreserveExistingMemoizationGuarantees:false
import {useMemo} from 'react';
import {Stringify} from 'shared-runtime';

function Component(props) {
  let Component = Stringify;

  Component = useMemo(() => {
    return Component;
  }, [Component]);

  return <Component {...props} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{name: 'Sathya'}],
};
