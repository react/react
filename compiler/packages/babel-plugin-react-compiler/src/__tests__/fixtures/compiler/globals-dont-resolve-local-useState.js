import {useState as _useState, useCallback, useEffect} from 'react';
import {ValidateMemoization} from 'shared-runtime';

function useState(value) {
  const [state, setState] = _useState(value);
  return [state, setState];
}

function Component() {
  const [state, setState] = useState('hello');

  return <div onClick={() => setState('goodbye')}>{state}</div>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
