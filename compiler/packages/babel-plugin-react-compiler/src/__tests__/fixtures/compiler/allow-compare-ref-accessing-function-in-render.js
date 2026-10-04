import {useRef} from 'react';
import {Stringify} from 'shared-runtime';

function Component({callback}) {
  const ref = useRef(null);
  const getValue = () => ref.current;
  // Comparing (not calling) a function that accesses a ref does not
  // access the ref during render, so this should not error.
  return <Stringify value={getValue === callback} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{callback: () => 42}],
};
