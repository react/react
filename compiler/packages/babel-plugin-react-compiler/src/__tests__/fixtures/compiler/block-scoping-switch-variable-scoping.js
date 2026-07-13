// @validateExhaustiveMemoizationDependencies:false
import {useMemo} from 'react';

function Component(props) {
  const outerHandlers = useMemo(() => {
    let handlers = {value: props.value};
    switch (props.test) {
      case true: {
        console.log(handlers.value);
        break;
      }
      default: {
      }
    }
    return handlers;
  });
  return outerHandlers;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{test: true, value: 'hello'}],
};
