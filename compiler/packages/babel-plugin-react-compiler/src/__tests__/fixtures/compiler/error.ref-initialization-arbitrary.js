//@flow
import {useRef} from 'react';

const DEFAULT_VALUE = 1;

component C() {
  const r = useRef(DEFAULT_VALUE);
  if (r.current == DEFAULT_VALUE) {
    r.current = 1;
  }
}

export const FIXTURE_ENTRYPOINT = {
  fn: C,
  params: [{}],
};
