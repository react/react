//@flow
import {useRef} from 'react';

component C() {
  const r = useRef(null);
  if (!r.current) {
    r.current = 1;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: C,
  params: [{}],
};
