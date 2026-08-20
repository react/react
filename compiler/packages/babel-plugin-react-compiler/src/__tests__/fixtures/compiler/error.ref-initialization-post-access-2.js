//@flow
import {useRef} from 'react';

component C() {
  const r = useRef(null);
  if (r.current == null) {
    r.current = 1;
  }
  f(r.current);
}

export const FIXTURE_ENTRYPOINT = {
  fn: C,
  params: [{}],
};
