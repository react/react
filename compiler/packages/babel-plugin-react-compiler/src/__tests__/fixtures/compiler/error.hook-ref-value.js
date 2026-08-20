import {useEffect, useRef} from 'react';

function Component(props) {
  const ref = useRef();
  useEffect(() => {}, [ref.current]);
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [],
};
