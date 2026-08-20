import {useEffect, useState} from 'react';

function Component() {
  const [state, setState] = useState('hello');
  useEffect(() => {
    setState('goodbye');
  }, []);

  return <div>{state}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
