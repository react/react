import {useRef} from 'react';

function Component(props) {
  const ref = useRef();
  return ref?.current;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
