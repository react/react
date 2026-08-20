import {useEffect, useState} from 'react';

let someGlobal = false;

function Component() {
  const [state, setState] = useState(someGlobal);

  useEffect(() => {
    someGlobal = true;
  }, []);

  useEffect(() => {
    setState(someGlobal);
  }, [someGlobal]);

  return <div>{String(state)}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
