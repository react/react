import {useEffect, useState} from 'react';

let someGlobal = false;

function Component() {
  const [state, setState] = useState(someGlobal);

  const setGlobal = () => {
    someGlobal = true;
  };
  const indirectSetGlobal = () => {
    setGlobal();
  };
  indirectSetGlobal();

  useEffect(() => {
    setState(someGlobal);
  }, [someGlobal]);

  return <div>{String(state)}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
