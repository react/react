import type {SetStateAction, Dispatch} from 'react';
import {useState} from 'react';

function Component(_props: {}) {
  const [x, _setX]: [number, Dispatch<SetStateAction<number>>] = useState(0);
  return {x};
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
