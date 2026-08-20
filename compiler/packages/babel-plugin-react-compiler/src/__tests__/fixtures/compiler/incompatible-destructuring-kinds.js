import {useMemo} from 'react';
import {Stringify} from 'shared-runtime';

function Component({}) {
  let a = 'a';
  let b = '';
  [a, b] = [null, null];
  // NOTE: reference `a` in a callback to force a context variable
  return <Stringify a={a} b={b} onClick={() => a} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
