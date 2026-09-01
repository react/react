import {useRef, useState} from 'react';

function Component(props) {
  const ref = useRef(props.value);
  const [state] = useState(() => ref.current);

  return <Stringify state={state} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{value: 42}],
};
