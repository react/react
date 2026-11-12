// @outputMode:"ssr"
import {useReducer} from 'react';

function Counter({count, dispatch}) {
  return (
    <div>
      {count} {typeof dispatch}
    </div>
  );
}

function Component() {
  // The dispatch function is passed to a child, so the state is not inlined
  const [count, dispatch] = useReducer((current, delta) => current + delta, 0);
  return <Counter count={count} dispatch={dispatch} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
