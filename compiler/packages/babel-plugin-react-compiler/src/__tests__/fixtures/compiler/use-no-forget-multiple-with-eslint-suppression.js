import {useRef} from 'react';

const useControllableState = options => {};
function NoopComponent() {}

function Component() {
  'use no forget';
  const ref = useRef(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  ref.current = 'bad';
  return <button ref={ref} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
