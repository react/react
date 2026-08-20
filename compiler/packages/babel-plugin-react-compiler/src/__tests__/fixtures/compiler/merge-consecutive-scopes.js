import {useState} from 'react';
import {Stringify} from 'shared-runtime';

function Component() {
  let [state, setState] = useState(0);
  return (
    <div>
      <Stringify text="Counter" />
      <span>{state}</span>
      <button data-testid="button" onClick={() => setState(state + 1)}>
        increment
      </button>
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};
