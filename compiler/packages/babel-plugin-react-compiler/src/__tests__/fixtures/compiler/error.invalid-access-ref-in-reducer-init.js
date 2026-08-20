import {useReducer, useRef} from 'react';

function Component(props) {
  const ref = useRef(props.value);
  const [state] = useReducer(
    (state, action) => state + action,
    0,
    init => ref.current
  );

  return <Stringify state={state} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};
