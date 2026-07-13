import {fbt} from 'fbt';
import {useState} from 'react';

const MIN = 10;

function Component() {
  const [count, setCount] = useState(0);

  return fbt(
    'Expected at least ' +
      fbt.param('min', MIN, {number: true}) +
      ' items, but got ' +
      fbt.param('count', count, {number: true}) +
      ' items.',
    'Error description'
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
