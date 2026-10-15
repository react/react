import {useState} from 'react';

function Component() {
  const [state, setState] = useState(0);
  const someConst = 42;
  const memoized = someConst * 2;
  const [anotherState, setAnotherState] = useState(0);

  return (
    <div>
      {memoized} {state} {anotherState}
    </div>
  );
}

export default Component;
