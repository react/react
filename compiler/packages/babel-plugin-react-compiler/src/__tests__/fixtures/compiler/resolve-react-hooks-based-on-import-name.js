import {useState as useReactState} from 'react';

function Component() {
  const [state, setState] = useReactState(0);

  const onClick = () => {
    setState(s => s + 1);
  };

  return (
    <>
      Count {state}
      <button onClick={onClick}>Increment</button>
    </>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
