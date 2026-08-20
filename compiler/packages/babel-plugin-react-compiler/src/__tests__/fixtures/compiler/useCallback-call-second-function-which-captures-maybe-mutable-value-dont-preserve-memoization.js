// @enablePreserveExistingMemoizationGuarantees:false @enableTransitivelyFreezeFunctionExpressions:false
import {useCallback} from 'react';
import {
  identity,
  logValue,
  makeObject_Primitives,
  useHook,
} from 'shared-runtime';

function Component(props) {
  const object = makeObject_Primitives();

  useHook();

  const log = () => {
    logValue(object);
  };

  const onClick = useCallback(() => {
    log();
  }, [log]);

  identity(object);

  return <div onClick={onClick} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
